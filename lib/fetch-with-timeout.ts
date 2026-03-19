/**
 * Wrapper for fetch promises to enforce a strict timeout.
 * Prevents infinite loading spinners on dropped connections or Vercel cold starts.
 */
export async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 8000,
  errorMessage: string = "Connection timed out. Please try again."
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Global fetch interceptor specifically injected into Supabase clients.
 */
export const supabaseFetchWithTimeout = (...args: Parameters<typeof fetch>) => {
  return fetchWithTimeout(
    fetch(...args),
    8000,
    "Data connection timed out. Please check your connection and try again."
  );
};
