import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // 1. Verify Webhook Signature
    if (!signature || !secret) {
      return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      console.error("Invalid webhook signature (timing-safe check failed)");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 2. Parse Event
    const event = JSON.parse(rawBody);
    console.log("Webhook received:", event.event);

    if (event.event === "order.paid" || event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      
      // 3. Update Database (Using SERVICE ROLE to bypass RLS)
      // Webhooks are server-to-server and don't have a user session.
      // We must use the SERVICE_ROLE key to update tables.
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! // Ensure this is in your .env.local
      );

      // Update payment_orders
      const { data: orderData, error: orderError } = await serviceClient
        .from("payment_orders")
        .update({
          status: "success",
          razorpay_payment_id: paymentId,
          verified_at: new Date().toISOString(),
        })
        .eq("razorpay_order_id", orderId)
        .select("user_id")
        .single();

      if (orderError || !orderData) {
        console.error("Error finding order:", orderError);
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const userId = orderData.user_id;

      // Activate Subscription
      const semesterEndDate = new Date();
      semesterEndDate.setMonth(semesterEndDate.getMonth() + 6);

      const { error: subError } = await serviceClient
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan_type: "pro",
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: semesterEndDate.toISOString(),
          razorpay_payment_id: paymentId,
        });

      if (subError) {
        console.error("Subscription activation failed:", subError);
        return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
      }

      console.log(`Subscription activated via webhook for user ${userId}`);
    }

    return NextResponse.json({ status: "ok" });

  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
