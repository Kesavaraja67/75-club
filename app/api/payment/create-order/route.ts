import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { razorpay, PAYMENT_CONFIG, generateReceiptId, rupeesToPaise } from "@/lib/razorpay";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // 1. Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate Limit: 5 order creations per minute (prevent spamming orders)
    const { success, reset } = await rateLimit(`order:${user.id}`, 5, 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { error: "Too many payment attempts. Please wait a minute." },
        { 
          status: 429,
          headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() }
        }
      );
    }

    // 2. Get request body (optional: plan type if you have multiple)
    const body = await request.json();
    const { planType = "semester" } = body;

    // 3. Determine amount based on plan
    const amount = PAYMENT_CONFIG.PRO_SEMESTER_PRICE;

    // 4. Create Razorpay order
    const order = await razorpay.orders.create({
      amount: rupeesToPaise(amount), // Amount in paise
      currency: PAYMENT_CONFIG.CURRENCY,
      receipt: generateReceiptId(),
      notes: {
        userId: user.id,
        userEmail: user.email || "",
        planType: planType,
      },
    });

    // 5. Store order in database (optional but recommended)
    const { error: dbError } = await supabase
      .from("payment_orders")
      .insert({
        order_id: order.id, 
        user_id: user.id,
        amount: amount,
        currency: PAYMENT_CONFIG.CURRENCY,
        status: "created",
        razorpay_order_id: order.id,
      });

    if (dbError) {
      console.error("Database error:", dbError);
      // Attempt to cancel the Razorpay order or return error
      return NextResponse.json(
        { error: "Failed to create order record" },
        { status: 500 }
      );
    }

    // 6. Return order details to frontend
    return NextResponse.json({
      orderId: order.id,
      amount: amount,
      currency: PAYMENT_CONFIG.CURRENCY,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });

  } catch (error: unknown) {
    console.error("Create order error:", error);
    const message = error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
