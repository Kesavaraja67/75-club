/**
 * Simple In-Memory Rate Limiter
 * 
 * NOTE: In a serverless environment (like Vercel), this memory is not shared 
 * across different lambda instances. However, it still provides a layer of 
 * protection against single-instance headers and local development spam.
 * 
 * For production-grade distributed rate limiting, consider using Redis (Upstash).
 */

type RateLimitContext = {
  count: number;
  resetAt: number;
};

// Global cache to persist across hot-reloads in dev
const globalRateLimits = global as unknown as { rateLimitCache?: Map<string, RateLimitContext> };
const trackers = globalRateLimits.rateLimitCache || new Map<string, RateLimitContext>();

if (process.env.NODE_ENV !== 'production') {
  globalRateLimits.rateLimitCache = trackers;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if a user has exceeded their rate limit
 * 
 * @param identifier Unique ID (User ID or IP)
 * @param limit Max requests allowed
 * @param windowMs Time window in milliseconds
 */
export async function rateLimit(
  identifier: string, 
  limit: number = 10, 
  windowMs: number = 60 * 1000
): Promise<RateLimitResult> {
  const now = Date.now();
  const key = `${identifier}`;
  
  const record = trackers.get(key);

  // If no record or expired, reset
  if (!record || now > record.resetAt) {
    trackers.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs
    };
  }

  // Check if limit exceeded
  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: record.resetAt
    };
  }

  // Increment count
  record.count += 1;
  
  // Cleanup periodically (every 1000 requests roughly) to prevent memory leaks
  if (trackers.size > 10000) {
    const now = Date.now();
    for (const [k, v] of trackers.entries()) {
      if (now > v.resetAt) trackers.delete(k);
    }
  }

  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: record.resetAt
  };
}
