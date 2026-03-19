import { NextResponse } from "next/server";
import crypto from "crypto";
import { activateProSubscription } from "@/lib/subscription-server";
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

    // 2. Identify User
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // If session lost, we rely on Webhook to activate. 
      // Redirect to login or home with a pending message.
      return NextResponse.redirect(new URL("/login?payment=pending", request.url));
    }

    // 3. Trigger Activation (Idempotent)
    await activateProSubscription(user.id, paymentId, 'verify');

    // 4. Return to Dashboard
    return NextResponse.redirect(new URL("/dashboard?payment=success", request.url));

  } catch (error) {
    console.error("[Callback] Error:", error);
    return NextResponse.redirect(new URL("/dashboard?payment=pending", request.url));
  }
}
