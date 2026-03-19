import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { activateProSubscription } from "@/lib/subscription-server";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // 1. Verify Webhook Signature (CRITICAL)
    if (!secret) {
      console.error("[Webhook] Missing RAZORPAY_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    // Validate signature format (at least 64 hex characters)
    if (!/^[a-f0-9]{64,}$/i.test(signature)) {
      console.error("[Webhook] Malformed signature header");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );

    if (!isValid) {
      console.error("[Webhook] Invalid signature received");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 2. Parse Event
    const event = JSON.parse(rawBody);
    const { event: eventType, payload } = event;
    console.log(`[Webhook] Event received: ${eventType}`);

    // Create a service client for administrative DB updates
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Handle Events
    switch (eventType) {
      case "payment.captured":
      case "order.paid": {
        const payment = payload.payment?.entity || payload.order?.entity;
        const razorpayOrderId = payment.order_id;
        const razorpayPaymentId = payment.id;

        // a. Idempotency Check: Fetch order by razorpay_order_id
        const { data: order, error: orderError } = await serviceClient
          .from("payment_orders")
          .select("user_id, status, processed_at")
          .eq("razorpay_order_id", razorpayOrderId)
          .maybeSingle();

        if (orderError || !order) {
          console.error(`[Webhook] Order not found: ${razorpayOrderId}`);
          return NextResponse.json({ error: "Order not found" }, { status: 200 }); // Return 200 to acknowledge receipt
        }

        // b. Skip if already processed by /verify
        if (order.processed_at) {
          console.log(`[Webhook] Order already processed: ${razorpayOrderId}`);
          return NextResponse.json({ status: "already_processed" });
        }

        // c. Update Order
        await serviceClient
          .from("payment_orders")
          .update({
            status: "paid",
            razorpay_payment_id: razorpayPaymentId,
            processed_at: new Date().toISOString(),
            webhook_received_at: new Date().toISOString()
          })
          .eq("razorpay_order_id", razorpayOrderId);

        // d. Activate Subscription
        try {
          await activateProSubscription(order.user_id, razorpayPaymentId, 'webhook');
          console.log(`[Webhook] Fulfilled order ${razorpayOrderId} for user ${order.user_id}`);
        } catch (activationError) {
          // Order is already marked paid; log for manual intervention but return 200
          console.error(`[Webhook] Activation failed for ${razorpayOrderId}:`, activationError);
          
          await serviceClient
            .from("payment_orders")
            .update({ failure_reason: `Activation error: ${activationError instanceof Error ? activationError.message : 'Unknown'}` })
            .eq("razorpay_order_id", razorpayOrderId);
        }
        break;
      }

      case "payment.failed": {
        const payment = payload.payment.entity;
        // Mark as failed in DB if not already processed
        // We check for webhook_received_at to maintain consistency
        await serviceClient
          .from("payment_orders")
          .update({
            status: "failed",
            failure_reason: payment.error_description || "Payment failed",
            webhook_received_at: new Date().toISOString()
          })
          .eq("razorpay_order_id", payment.order_id)
          .is("webhook_received_at", null); 
        console.log(`[Webhook] Payment failed: ${payment.order_id}`);
        break;
      }

      case "refund.created": {
        const refund = payload.refund.entity;
        const razorpayPaymentId = refund.payment_id;

        // Fetch order by payment_id
        const { data: order } = await serviceClient
          .from("payment_orders")
          .select("user_id, razorpay_order_id, razorpay_payment_id")
          .eq("razorpay_payment_id", razorpayPaymentId)
          .maybeSingle();

        if (order) {
          // Deactivate subscription (idempotent since cancelled->cancelled is a no-op if status neq checked)
          await serviceClient
            .from("subscriptions")
            .update({ 
               status: "cancelled", 
               updated_at: new Date().toISOString() 
            })
            .eq("user_id", order.user_id)
            .neq("status", "cancelled");

          // Update refund tracking
          await serviceClient
            .from("payment_orders")
            .update({ 
               status: "refunded",
               razorpay_refund_id: refund.id 
            })
            .eq("razorpay_payment_id", razorpayPaymentId);
            
          console.log(`[Webhook] Refund handled for user ${order.user_id}`);
        }
        break;
      }
    }

    // Always return 200 to Razorpay within 5 seconds
    return NextResponse.json({ status: "ok" });

  } catch (error: unknown) {
    console.error("[Webhook] Exception:", error);
    // Be careful with status codes: 5xx makes Razorpay retry. 
    // Only return 5xx for actual transient server errors.
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
