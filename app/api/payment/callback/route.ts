import { NextResponse } from "next/server";
import crypto from "crypto";
import { activateProSubscription } from "@/lib/subscription-server";
import { getRazorpay } from "@/lib/razorpay";
import { createClient } from "@/lib/supabase/server";

/**
 * @file api/payment/callback/route.ts
 * @description Handle the redirect flow from Razorpay. 
 * This is the critical fallback for iOS PWA Safari standalone mode where 
 * the in-page handler often fails to trigger upon returning to the app.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("razorpay_order_id");
  const paymentId = searchParams.get("razorpay_payment_id");
  const signature = searchParams.get("razorpay_signature");

  if (!orderId || !paymentId || !signature) {
    return NextResponse.redirect(new URL("/dashboard?payment=failed&reason=missing_params", request.url));
  }

  try {
    // 1. Verify Signature
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(signature, "hex")
    );

    if (!isValid) {
      return NextResponse.redirect(new URL("/dashboard?payment=failed&reason=invalid_signature", request.url));
    }

    // 2. Identify User & Fulfil (using notes.userId from Razorpay to be session-independent)
    // The signature check already proved the orderId/paymentId are genuine.
    const razorpay = getRazorpay();
    let userId: string | null = null;
    
    try {
      const order = await razorpay.orders.fetch(orderId);
      userId = order.notes?.userId as string;
    } catch (err) {
      console.error("[Callback] Failed to fetch order notes from Razorpay:", err);
    }

    if (!userId) {
      // Fallback to session if notes are missing (should not happen in prod)
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      console.error("[Callback] Could not resolve user identity for payment:", paymentId);
      return NextResponse.redirect(new URL("/login?payment=pending", request.url));
    }

    // 3. Trigger Activation (Idempotent by paymentId)
    await activateProSubscription(userId, paymentId, 'verify');

    // 4. Return to Dashboard
    return NextResponse.redirect(new URL("/dashboard?payment=success", request.url));

  } catch (error) {
    console.error("[Callback] Error:", error);
    return NextResponse.redirect(new URL("/dashboard?payment=pending", request.url));
  }
}
