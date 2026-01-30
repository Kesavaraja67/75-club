import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { razorpay, PAYMENT_CONFIG, generateReceiptId, rupeesToPaise } from "@/lib/razorpay";

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
        userEmail: user.email!,
        planType: planType,
      },
    });

    // 5. Store order in database (optional but recommended)
    const { error: dbError } = await supabase
      .from("payment_orders")
      .insert({
        order_id: order.id, // Our internal ID (optional, using RP id as main ref here) - wait, schema has order_id text unique. I will use razorpay order id for both or generate one. The PROMPT SAYS: order_id, user_id, amount. I will use a UUID or the RP ID. The Code provided in Prompt 2 prompt uses order.id for razorpay_order_id. It also inserts order_id. The migration in Prompt 6 has `order_id text unique not null`. I'll use the razorpay order id for both to be safe, or generate a UUID if I could, but the code in Prompt 2 snippet provided by user only passed `order_id: order.id` and `razorpay_order_id: order.id`. This is fine.
        order_id: order.id, 
        user_id: user.id,
        amount: amount,
        currency: PAYMENT_CONFIG.CURRENCY,
        status: "created",
        razorpay_order_id: order.id,
      });

    if (dbError) {
      console.error("Database error:", dbError);
      // Continue anyway - order is created in Razorpay
    }

    // 6. Return order details to frontend
    return NextResponse.json({
      orderId: order.id,
      amount: amount,
      currency: PAYMENT_CONFIG.CURRENCY,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });

  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
