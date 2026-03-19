import { createBrowserClient, type CookieOptions } from '@supabase/ssr'
import { supabaseFetchWithTimeout } from '@/lib/fetch-with-timeout'
import { isInstalledPWA } from '@/lib/pwa-utils'

let client: ReturnType<typeof createBrowserClient> | undefined;

export const createClient = () => {
  if (client) return client;
  
  const options = {
    global: {
      fetch: supabaseFetchWithTimeout,
    },
  } as NonNullable<Parameters<typeof createBrowserClient>[2]>;

  if (isInstalledPWA()) {
    options.cookies = {
      get(name: string) {
        if (typeof window === 'undefined') return '';
        
        const storageKey = `sb-${name}`;
        const localVal = window.localStorage.getItem(storageKey);
        
        // 1. Check for explicit revocation marker (set by proxy on 401/403)
        // If the server explicitly cleared the cookie, we should not revive it from localStorage
        const revokedKey = `${storageKey}-revoked`;
        const isRevoked = document.cookie.includes(`${revokedKey}=true`);
        
        if (isRevoked) {
          console.warn(`[SupabaseClient] Session ${name} is marked as revoked. Clearing storage.`);
          window.localStorage.removeItem(storageKey);
          return '';
        }

        // 2. Standard cookie check
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = document.cookie.match(new RegExp('(^| )' + escapedName + '=([^;]+)'));
        const cookieVal = match ? match[2] : null;

        // 3. Sync cookie to localStorage if they differ
        if (cookieVal && cookieVal !== localVal) {
          window.localStorage.setItem(storageKey, cookieVal);
          return cookieVal;
        }

        return localVal ?? cookieVal ?? '';
      },
      set(name: string, value: string, cookieOptions: CookieOptions) {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(`sb-${name}`, value);
        
        let cookieString = `${name}=${value}; path=${cookieOptions.path || '/'};`;
        if (cookieOptions.maxAge) cookieString += ` max-age=${cookieOptions.maxAge};`;
        if (cookieOptions.domain) cookieString += ` domain=${cookieOptions.domain};`;
        if (cookieOptions.secure) cookieString += ` secure;`;
        cookieString += ` SameSite=${cookieOptions.sameSite || 'Lax'};`;
        document.cookie = cookieString;
      },
      remove(name: string, cookieOptions: CookieOptions) {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(`sb-${name}`);
        let cookieString = `${name}=; path=${cookieOptions.path || '/'}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;`;
        if (cookieOptions.domain) cookieString += ` domain=${cookieOptions.domain};`;
        document.cookie = cookieString;
      },
    };
  }

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options
  );
  
  return client;
}
