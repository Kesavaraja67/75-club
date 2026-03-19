import { createClient } from "@supabase/supabase-js";
import { SubscriptionStatus } from "@/lib/subscription";

/**
 * @file lib/subscription-server.ts
 * @description Server-side subscription utilities using the SERVICE ROLE.
 * Use this for webhooks and verification routes where RLS might be restrictive.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_SERVICE_ROLE) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for server-side subscription management");
}

/**
 * Service client that bypasses RLS for administrative updates.
 */
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Get subscription status for any user (server-side only)
 */
export async function getServerSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const { data, error } = await serviceClient
    .from('subscriptions')
    .select('plan_type, status, current_period_end')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
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

  const isActive = 
    data.status === 'active' && 
    data.plan_type === 'pro' &&
    (data.current_period_end === null || 
     new Date(data.current_period_end) > new Date());

  if (!isActive) {
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

  return {
    tier: 'pro',
    isProUser: true,
    subjectLimit: Number.MAX_SAFE_INTEGER,
    canUseAIScan: true,
    canUseCalendar: true,
    canUseAIBuddy: true,
    canExportData: true,
    expiresAt: data.current_period_end ? new Date(data.current_period_end) : null
  };
}

/**
 * Activates or extends a subscription (Server-side only)
 */
export async function activateProSubscription(
  userId: string, 
  paymentId: string,
  method: 'verify' | 'webhook' | 'manual' = 'verify'
) {
  // 1. Calculate new end date (180 days from now or from existing end date)
  const { data: existing } = await serviceClient
    .from('subscriptions')
    .select('current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  const now = new Date();
  const baseDate = (existing?.current_period_end && new Date(existing.current_period_end) > now)
    ? new Date(existing.current_period_end)
    : now;

  const newEndDate = new Date(baseDate);
  newEndDate.setDate(newEndDate.getDate() + 180);

  // 2. Performance atomic upsert
  const { error } = await serviceClient
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

  if (error) throw error;

  return { success: true, expiresAt: newEndDate };
}
