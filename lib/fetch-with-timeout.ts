/**
 * Wrapper for fetch promises to enforce a strict timeout.
 * Prevents infinite loading spinners on dropped connections or Vercel cold starts.
 */
export async function fetchWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = 45000,
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

export const supabaseFetchWithTimeout: typeof fetch = (input, init) => {
  return fetchWithTimeout(
    (timeoutSignal) => {
      const signal = init?.signal
        ? typeof AbortSignal !== 'undefined' && 'any' in AbortSignal
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (AbortSignal as any).any([init.signal, timeoutSignal])
          : timeoutSignal // Node.js < 20 / older browser fallback
        : timeoutSignal;

      // Selective Cache Busting:
      // Only disable cache for REST (database) requests.
      // Leave Auth requests untouched to avoid session interference.
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const isRest = url.includes('/rest/v1/');
      
      return fetch(input, { 
        ...init, 
        signal,
        ...(isRest ? { cache: 'no-store' } : {})
      });
    },
    45000,
    "Data connection timed out. Please check your connection and try again."
  );
};
