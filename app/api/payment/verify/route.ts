import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { activateProSubscription } from "@/lib/subscription-server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Rate Limit
    const { success, reset } = await rateLimit(`verify_hardened:${user.id}`, 10, 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait." },
        { 
          status: 429,
          headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() }
        }
      );
    }

    // 2. Parse Body
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    // 3. Signature Verification (CRITICAL)
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error("[Verify] Missing RAZORPAY_KEY_SECRET");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Validate signature format (64 hex characters)
    if (!/^[a-f0-9]{64}$/i.test(razorpay_signature)) {
      console.error("[Verify] Invalid signature format");
      return NextResponse.json({ error: "Invalid signature format" }, { status: 400 });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(razorpay_signature, "hex")
    );

    if (!isValid) {
      console.error(`[Verify] Invalid signature for user ${user.id}`);
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // 4. Idempotency Check
    // Fetch order to ensure it belongs to the user and isn't already processed
    const { data: order, error: orderError } = await supabase
      .from("payment_orders")
      .select("status, processed_at")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderError || !order) {
      console.error(`[Verify] Order not found or mismatch: ${razorpay_order_id}`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.processed_at) {
      console.log(`[Verify] Order already processed: ${razorpay_order_id}`);
      return NextResponse.json({ success: true, message: "Already activated" });
    }

    // 5. Atomic Update & Fulfillment
    // Update order status first to 'paid' and set processed_at
    const { error: updateError } = await supabase
      .from("payment_orders")
      .update({
        status: "paid",
        razorpay_payment_id: razorpay_payment_id,
        processed_at: new Date().toISOString(),
        verified_at: new Date().toISOString()
      })
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[Verify] Failed to mark order as paid:", updateError);
      return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
    }

    // 6. Activate Subscription (via service role to ensure success)
    try {
      await activateProSubscription(user.id, razorpay_payment_id, 'verify');
    } catch (subError) {
      console.error("[Verify] Critical: Payment taken but subscription activation failed:", subError);
      // We don't return 500 here because the money WAS taken and order IS marked paid.
      // Webhook fallback or manual audit will fix this.
      return NextResponse.json({ 
        success: true, 
        message: "Payment received. Your account will be activated within 5 minutes.",
        pending: true
      });
    }

    return NextResponse.json({
      success: true,
      message: "🎉 Welcome to Pro! Your subscription is now active.",
    });

  } catch (error: unknown) {
    console.error("[Verify] Exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
