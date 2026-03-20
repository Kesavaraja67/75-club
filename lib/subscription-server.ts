import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRazorpay } from "./razorpay";

/**
 * Lazy initialization for the Supabase service client.
 * This client bypasses Row Level Security (RLS) handles sensitive updates.
 */
let serviceClient: SupabaseClient | null = null;

function getServiceClient() {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for server-side subscription management");
  }

  serviceClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceClient;
}

export type SubscriptionTier = 'free' | 'pro' | 'expired';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isProUser: boolean;
  subjectLimit: number;
  canUseAIScan: boolean;
  canUseCalendar: boolean;
  canUseAIBuddy: boolean;
  canExportData: boolean;
  expiresAt: string | null;
}

/**
 * Server-only function to check subscription status with service-role permissions.
 * Useful for webhooks and API routes.
 */
export async function getServerSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('subscriptions')
    .select('plan_type, status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  // Distinguish between true query errors and "not found"
  if (error) {
    console.error(`[SubscriptionServer] Query error for user ${userId}:`, error);
    throw new Error(`Failed to fetch subscription status: ${error.message}`);
  }

  if (!data) {
    return {
      tier: 'free',
      isProUser: false,
      subjectLimit: 4,
      canUseAIScan: false,
      canUseCalendar: false,
      canUseAIBuddy: false,
      canExportData: false,
      expiresAt: null
    };
  }

  const isPro = data.plan_type === 'pro' && data.status === 'active';
  
  // SELF-HEALING: If not Pro, check for missed activations once
  if (!isPro) {
    try {
      const reconciled = await reconcileSubscription(userId);
      if (reconciled) {
        // Re-fetch or return the new status
        return getServerSubscriptionStatus(userId);
      }
    } catch (err) {
      console.error(`[SubscriptionServer] Self-healing failed for ${userId}:`, err);
    }
  }

  const expiresAt = data.current_period_end;
  const isExpired = expiresAt && new Date(expiresAt) < new Date();

  return {
    tier: isPro ? (isExpired ? 'expired' : 'pro') : 'free',
    isProUser: isPro && !isExpired,
    subjectLimit: isPro ? 20 : 4,
    canUseAIScan: isPro,
    canUseCalendar: isPro,
    canUseAIBuddy: isPro,
    canExportData: isPro,
    expiresAt: expiresAt
  };
}

/**
 * Reconciles missing subscriptions by checking for unreconciled orders.
 * Now even checks 'created' orders against Razorpay API to catch sync failures.
 */
export async function reconcileSubscription(userId: string): Promise<boolean> {
  const client = getServiceClient();
  const now = new Date();

  // 1. Find the latest order (either 'paid' or 'created')
  const { data: latestOrder, error: orderError } = await client
    .from('payment_orders')
    .select('razorpay_order_id, razorpay_payment_id, status')
    .eq('user_id', userId)
    .in('status', ['paid', 'created'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError || !latestOrder) {
    return false;
  }

  let finalPaymentId = latestOrder.razorpay_payment_id;

  // 2. If 'created', check Razorpay directly to see if it was actually paid
  if (latestOrder.status === 'created' && latestOrder.razorpay_order_id) {
    try {
      const razorpay = getRazorpay();
      const payments = await razorpay.orders.fetchPayments(latestOrder.razorpay_order_id);
      
      // Find any successful payment for this order
      const successfulPayment = (payments.items || []).find(p => 
        p.status === 'captured' || p.status === 'authorized'
      );

      if (successfulPayment) {
        console.log(`[SubscriptionServer] Verified payment ${successfulPayment.id} for order ${latestOrder.razorpay_order_id} via Razorpay API.`);
        finalPaymentId = successfulPayment.id;
        
        // Update local DB since we now know it's paid
        await client
          .from('payment_orders')
          .update({
            status: 'paid',
            razorpay_payment_id: finalPaymentId,
            verified_at: now.toISOString(),
            processed_at: now.toISOString()
          })
          .eq('razorpay_order_id', latestOrder.razorpay_order_id);
      }
    } catch (rzpErr) {
      console.error("[SubscriptionServer] Failed to fetch payments from Razorpay:", rzpErr);
    }
  }

  if (!finalPaymentId) {
    return false;
  }

  // 3. Check if this payment is already linked to an active subscription
  const { data: activeSub } = await client
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('razorpay_payment_id', finalPaymentId)
    .eq('status', 'active')
    .maybeSingle();

  if (activeSub) {
    // If it exists and matches exactly, we are done.
    return false;
  }

  console.log(`[SubscriptionServer] Self-healing: Found missing activation for user ${userId}. Reconciling...`);
  await activateProSubscription(userId, finalPaymentId, 'manual');
  return true;
}

/**
 * Activates or extends a Pro subscription for a user.
 * Idempotent: Subsequent calls with the SAME paymentId will result in NO change.
 */
export async function activateProSubscription(
  userId: string, 
  paymentId: string,
  method: 'verify' | 'webhook' | 'manual' = 'verify'
) {
  const client = getServiceClient();
  console.log(`[SubscriptionServer] Starting Pro activation for user ${userId} via ${method}`);

  // 1. FETCH CURRENT SUBSCRIPTION (to handle duration extension)
  const { data: existing, error: fetchError } = await client
    .from('subscriptions')
    .select('current_period_end, razorpay_payment_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Activation failed during lookup: ${fetchError.message}`);
  }

  // 2. IDEMPOTENCY CHECK
  if (existing?.razorpay_payment_id === paymentId) {
    console.log(`[SubscriptionServer] Payment ${paymentId} already processed for user ${userId}. Skipping.`);
    return;
  }

  // 3. CALCULATE END DATE
  const now = new Date();
  const currentEnd = existing?.current_period_end ? new Date(existing.current_period_end) : null;
  const baseDate = (currentEnd && currentEnd > now) ? currentEnd : now;
  const newEndDate = new Date(baseDate);
  newEndDate.setDate(newEndDate.getDate() + 180);

  // 4. ATOMIC UPSERT
  const { error: upsertError } = await client
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_type: 'pro',
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: newEndDate.toISOString(),
      razorpay_payment_id: paymentId,
      activated_via: method,
      updated_at: now.toISOString()
    }, { onConflict: 'user_id' });

  if (upsertError) {
    console.error(`[SubscriptionServer] Upsert error for user ${userId}:`, upsertError);
    throw new Error(`Failed to update subscription: ${upsertError.message}`);
  }

  console.log(`[SubscriptionServer] Activated Pro for user ${userId} via ${method}. New expiry: ${newEndDate.toISOString()}`);
}
