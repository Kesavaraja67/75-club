import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
