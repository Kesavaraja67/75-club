import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRazorpay, generateOrderNotes } from "@/lib/razorpay";
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
    // 4. PREVENT DUPLICATE ORDERS (idempotency)
    // Check for an existing 'created' order in the last 15 minutes to avoid spamming Razorpay.
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: existingOrder } = await supabase
      .from("payment_orders")
      .select("razorpay_order_id, amount, currency")
      .eq("user_id", user.id)
      .eq("status", "created")
      .gt("created_at", fifteenMinsAgo)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (existingOrder) {
      console.log(`[Order] Reusing existing order: ${existingOrder.razorpay_order_id}`);
      return NextResponse.json({
        orderId: existingOrder.razorpay_order_id,
        amount: existingOrder.amount,
        currency: existingOrder.currency,
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        user: {
          name: user.email?.split('@')[0] || "Student",
          email: user.email,
          contact: "", 
        }
      });
    }

    // 5. CREATE NEW ORDER IN RAZORPAY
    const razorpay = getRazorpay();
    const amount = 249; // Strictly ₹249
    const amountInPaise = amount * 100;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}_${user.id.substring(0, 8)}`,
      notes: generateOrderNotes(user.id, "semester"),
    });

    // 6. Store order in database
    const { error: dbError } = await supabase
      .from("payment_orders")
      .insert({
        user_id: user.id,
        order_id: order.receipt,         // Required by not-null constraint
        razorpay_order_id: order.id,
        amount: amount,
        currency: "INR",
        status: "created",
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
