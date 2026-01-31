import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate Limit: 5 verification attempts per minute
    const { success, reset } = await rateLimit(`verify:${user.id}`, 5, 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait a minute." },
        { 
          status: 429,
          headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() }
        }
      );
    }

    // Get payment details from request
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const isValid = razorpay_signature && 
      expectedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(razorpay_signature, "hex")
      );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Payment verified! Update database
    // 1. Update payment order status, BUT only if it belongs to this user and is still 'created'
    const { data: orderData, error: orderError } = await supabase
      .from("payment_orders")
      .update({
        status: "success",
        razorpay_payment_id: razorpay_payment_id,
        verified_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id) // Ensure ownership
      .eq("status", "created") // Ensure not already processed
      .select("user_id")
      .single();

    if (orderError || !orderData) {
      console.error("Order verification failed or order already processed:", orderError);
      return NextResponse.json(
        { error: "Order not found, not yours, or already processed" },
        { status: 400 }
      );
    }

    // 2. Create/Update subscription (Only if step 1 succeeded)
    
    // Fetch existing subscription to check for remaining time
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("current_period_end")
      .eq("user_id", user.id)
      .single();

    const now = new Date();
    const existingEnd = existingSub?.current_period_end ? new Date(existingSub.current_period_end) : new Date(0);
    
    // If user has time remaining (end date > now), extend from there. Otherwise start from now.
    const startDate = existingEnd > now ? existingEnd : now;
    
    const semesterEndDate = new Date(startDate);
    semesterEndDate.setMonth(semesterEndDate.getMonth() + 6); // Add 6 months

    const { error: subError } = await supabase
      .from("subscriptions")
      .upsert({
        user_id: user.id, // Use authenticated user ID
        plan_type: "pro",
        status: "active",
        current_period_start: startDate.toISOString(),
        current_period_end: semesterEndDate.toISOString(),
        razorpay_payment_id: razorpay_payment_id,
      });

    if (subError) {
      console.error("Subscription update error:", subError);
      return NextResponse.json(
        { error: "Failed to activate subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and subscription activated!",
    });

  } catch (error: unknown) {
    console.error("Verify payment error:", error);
    const message = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
