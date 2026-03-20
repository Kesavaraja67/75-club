import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Subscription utilities for Free vs Pro tier management
 */

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isProUser: boolean;
  subjectLimit: number;
  canUseAIScan: boolean;
  canUseCalendar: boolean;
  canUseAIBuddy: boolean;
  canExportData: boolean;
  expiresAt?: Date | null;
}

const DEFAULT_FREE_STATUS: SubscriptionStatus = {
  tier: 'free',
  isProUser: false,
  subjectLimit: 4,
  canUseAIScan: false,
  canUseCalendar: false,
  canUseAIBuddy: false,
  canExportData: false,
  expiresAt: null,
};

/**
 * Fetch subscription status for a user from database
 */
export async function fetchSubscriptionStatus(userId?: string, client?: SupabaseClient): Promise<SubscriptionStatus | null> {
  const supabase = client || createClient();
  
  try {
    let targetUserId = userId;
    
    // If no userId provided, get current user
    if (!targetUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("[Subscription] Auth error:", authError);
        return null;
      }
      if (!user) {
        console.log("[Subscription] No user found");
        return null;
      }
      targetUserId = user.id;
    }

    // console.log("[Subscription] Fetching for user:", targetUserId);

    // Fetch subscription from subscriptions table
    // Note: Global fetch is already configured with cache: 'no-store' in lib/fetch-with-timeout.ts
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('plan_type, status, current_period_end')
      .eq('user_id', targetUserId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error("[Subscription] Error fetching subscription:", error);
      return null;
    }

    if (!subscription) {
      console.log("[Subscription] No active subscription found");
      return DEFAULT_FREE_STATUS;
    }

    // console.log("[Subscription] Subscription data:", subscription);

    const tier = (subscription.plan_type as SubscriptionTier) || 'free';
    const endDate = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
    
    // Double check active status (already filtered by query, but safe to keep)
    const isActivePro = tier === 'pro' && subscription.status === 'active'; 

    if (!isActivePro) {
      console.log("[Subscription] User is FREE tier");
      return DEFAULT_FREE_STATUS;
    }

    console.log("[Subscription] ✅ User is PRO tier!");

    return {
      tier: 'pro',
      isProUser: true,
      subjectLimit: Number.MAX_SAFE_INTEGER,
      canUseAIScan: true,
      canUseCalendar: true,
      canUseAIBuddy: true,
      canExportData: true,
      expiresAt: endDate,
    };
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
         // Quietly ignore aborts
         // console.log("[Subscription] Fetch aborted");
      } else {
         console.error("[Subscription] Unexpected error:", error.message || error);
      }
    } else {
      console.error("[Subscription] Unexpected error:", error);
    }
    return null;
  }
}

/**
 * Feature names for upgrade prompts
 */
export const FEATURE_NAMES = {
  AI_SCAN: 'AI Scan',
  CALENDAR: 'Calendar View',
  AI_BUDDY: 'AI Buddy',
  UNLIMITED_SUBJECTS: 'Unlimited Subjects',
  ADVANCED_STATS: 'Advanced Analytics',
  EXPORT_DATA: 'Export Data',
} as const;

/**
 * Upgrade messages
 */
export const UPGRADE_MESSAGES = {
  SUBJECT_LIMIT: "You've reached the free tier limit of 4 subjects. Upgrade to Pro for unlimited subjects!",
  AI_SCAN: "AI Scan is a Pro feature. Upgrade to scan unlimited attendance screenshots instantly!",
  CALENDAR: "Calendar view is available for Pro users. Upgrade to unlock attendance predictions!",
  ADVANCED_STATS: "Unlock detailed analytics and insights with Pro!",
  AI_BUDDY: "AI Buddy is your personal attendance assistant. Upgrade to Pro to get smart suggestions!",
} as const;
