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

    // Fail fast if public key is missing
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKeyId) {
      console.error("Missing NEXT_PUBLIC_RAZORPAY_KEY_ID");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 2. Get request body and validate plan
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { planType = "semester" } = body;

    const ALLOWED_PLANS: Record<string, number> = {
      "semester": PAYMENT_CONFIG.PRO_SEMESTER_PRICE,
      "yearly": 1999, // Example future plan, using same price for now if not defined in config
    };

    // Default to semester if invalid plan provided
    const validPlanType = Object.prototype.hasOwnProperty.call(ALLOWED_PLANS, planType) 
      ? planType 
      : "semester";
    const amount = ALLOWED_PLANS[validPlanType];

    // 4. Create Razorpay order
    const order = await razorpay.orders.create({
      amount: rupeesToPaise(amount), // Amount in paise
      currency: PAYMENT_CONFIG.CURRENCY,
      receipt: generateReceiptId(),
      notes: {
        userId: user.id,
        userEmail: user.email || "",
        planType: validPlanType,
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
      key: razorpayKeyId,
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
