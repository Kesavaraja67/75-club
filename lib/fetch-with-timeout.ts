/**
 * Wrapper for fetch promises to enforce a strict timeout.
 * Prevents infinite loading spinners on dropped connections or Vercel cold starts.
 */
export async function fetchWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = 25000,
  errorMessage: string = "Connection timed out. Please try again."
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error(errorMessage)), timeoutMs);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Global fetch interceptor specifically injected into Supabase clients.
 */
export const supabaseFetchWithTimeout: typeof fetch = (input, init) => {
  return fetchWithTimeout(
    (timeoutSignal) => {
      const signal = init?.signal
        ? typeof AbortSignal !== 'undefined' && 'any' in AbortSignal
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (AbortSignal as any).any([init.signal, timeoutSignal])
          : timeoutSignal // Node.js < 20 / older browser fallback
        : timeoutSignal;
      return fetch(input, { 
        ...init, 
        signal,
        // CRITICAL: Disable Next.js global fetch cache for Supabase requests.
        // This ensures subscription status and attendance data are always fresh.
        cache: 'no-store'
      });
    },
    25000,
    "Data connection timed out. Please check your connection and try again."
  );
};
