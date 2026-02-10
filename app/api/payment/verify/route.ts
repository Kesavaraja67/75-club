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

    // Rate Limit: 10 verification attempts per minute (increased slightly)
    const { success, reset } = await rateLimit(`verify:${user.id}`, 10, 60 * 1000);
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
    // Handle Race Condition: Webhook might have already updated the status to 'success'.
    
    // 1. Fetch current order status
    const { data: orderData, error: fetchError } = await supabase
      .from("payment_orders")
      .select("status, razorpay_payment_id")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !orderData) {
       console.error("Order fetch failed:", fetchError);
       return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Check if already processed
    if (orderData.status === 'success') {
      // Create idempotency check
      if (orderData.razorpay_payment_id === razorpay_payment_id) {
         console.log("Payment already verification via webhook/other thread. Returning success.");
         return NextResponse.json({
            success: true,
            message: "Payment verified and subscription activated!",
         });
      } else {
         console.error("Payment ID mismatch on successful order. Possible fraud attempt.");
         return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
      }
    }

    // 3. If not success, attempt to update (using optimistic concurrency if needed, but simple update here is fine as we are the 'main' verifier if webhook didn't get there)
    // Note: If webhook fires RIGHT NOW, it might overwrite. 
    // Ideally we use a stored procedure or careful locking, but for this scale:
    // We try to update.
    
    const { error: updateError } = await supabase
      .from("payment_orders")
      .update({
        status: "success",
        razorpay_payment_id: razorpay_payment_id,
        verified_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id); // RLS likely handles this too

    if (updateError) {
       console.error("Failed to update order status:", updateError);
       // It's possible it failed because of some constraint, but we'll return error to be safe.
       // In a race, the webhook likely won. The user can retry or refresh.
       return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
    }

    // 4. Activate Subscription
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
