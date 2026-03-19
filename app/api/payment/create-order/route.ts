import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { razorpay, PAYMENT_CONFIG, rupeesToPaise } from "@/lib/razorpay";
import { rateLimit } from "@/lib/rate-limit";
import { getServerSubscriptionStatus } from "@/lib/subscription-server";

export async function POST() {
  try {
    // 1. Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Check if user already has active Pro subscription
    const subStatus = await getServerSubscriptionStatus(user.id);
    if (subStatus.isProUser) {
      return NextResponse.json(
        { error: "You already have an active Pro subscription" },
        { status: 400 }
      );
    }

    // 3. Rate Limit: 5 order creations per hour (prevent spamming)
    // Using 5 per hour as requested for production hardening
    const { success, reset } = await rateLimit(`order_hardened:${user.id}`, 5, 60 * 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { error: "Too many payment attempts. Please try again in an hour." },
        { 
          status: 429,
          headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() }
        }
      );
    }

    // 4. Check for existing unpaid order in last 30 minutes (prevent duplicates)
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: existingOrder } = await supabase
      .from("payment_orders")
      .select("razorpay_order_id, amount, currency")
      .eq("user_id", user.id)
      .eq("status", "created")
      .gt("created_at", thirtyMinsAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingOrder) {
      console.log(`[Order] Returning existing unpaid order: ${existingOrder.razorpay_order_id}`);
      return NextResponse.json({
        orderId: existingOrder.razorpay_order_id,
        amount: existingOrder.amount,
        currency: existingOrder.currency,
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        user: {
          name: user.user_metadata?.full_name || "",
          email: user.email || "",
          contact: user.user_metadata?.phone || ""
        }
      });
    }

    // 5. Create new Razorpay order
    const amount = PAYMENT_CONFIG.PRO_SEMESTER_PRICE;
    const receiptId = `rect_${user.id.substring(0, 8)}_${Date.now()}`;
    
    const order = await razorpay.orders.create({
      amount: rupeesToPaise(amount),
      currency: "INR",
      receipt: receiptId,
      notes: {
        userId: user.id,
        planType: "semester",
        app: "75club"
      },
    });

    // 6. Store order in database
    const { error: dbError } = await supabase
      .from("payment_orders")
      .insert({
        user_id: user.id,
        amount: amount,
        currency: "INR",
        status: "created",
        razorpay_order_id: order.id,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error("[Order] Database record failed:", dbError);
      return NextResponse.json({ error: "Failed to initialize order" }, { status: 500 });
    }

    // 7. Return order details + prefill data
    return NextResponse.json({
      orderId: order.id,
      amount: amount,
      currency: "INR",
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      user: {
        name: user.user_metadata?.full_name || "",
        email: user.email || "",
        contact: user.user_metadata?.phone || ""
      }
    });

  } catch (error: unknown) {
    console.error("[Order] Exception:", error);
    return NextResponse.json(
      { error: "Internal server error during order creation" },
      { status: 503 }
    );
  }
}
