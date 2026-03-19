/**
 * Wrapper for fetch promises to enforce a strict timeout.
 * Prevents infinite loading spinners on dropped connections or Vercel cold starts.
 */
export async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 8000,
  errorMessage: string = "Connection timed out. Please try again."
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) =>
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
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
