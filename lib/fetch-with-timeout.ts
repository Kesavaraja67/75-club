/**
 * Wrapper for fetch promises to enforce a strict timeout.
 * Prevents infinite loading spinners on dropped connections or Vercel cold starts.
 */
export async function fetchWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = 8000,
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
    (signal) => fetch(input, { ...init, signal }),
    8000,
    "Data connection timed out. Please check your connection and try again."
  );
};
