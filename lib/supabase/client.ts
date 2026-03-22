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
        
        // Supabase names cookies like 'sb-<project-id>-auth-token'
        // Our storageKey should match the cookie name but we must avoid double-prefixing
        const storageKey = name.startsWith('sb-') ? name : `sb-${name}`;
        const localVal = window.localStorage.getItem(storageKey);
        
        // 1. Check for explicit revocation marker
        const revokedKey = `${storageKey}-revoked`;
        const isRevoked = document.cookie.includes(`${revokedKey}=true`);
        
        if (isRevoked) {
          console.warn(`[SupabaseClient] Session ${name} is marked as revoked. Clearing storage.`);
          window.localStorage.removeItem(storageKey);
          return '';
        }

        // 2. Standard cookie check (supporting chunks)
        // If cookie is present, it's the source of truth.
        // We look for the main cookie AND any chunks (.0, .1...)
        const getCookie = (name: string) => {
          const match = document.cookie.match(new RegExp('(^| )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]+)'));
          return match ? match[2] : null;
        };

        let cookieVal = getCookie(name);
        
        // If the main cookie is missing, equals 'true' (SSR marker), or looks truncated (no dots for JWT)
        // attempt to read it as a chunked session
        const isLikelyFragment = cookieVal === 'true' || (cookieVal && !cookieVal.includes('.') && !cookieVal.startsWith('{'));
        
        if (!cookieVal || isLikelyFragment) {
          let chunk = 0;
          let combined = '';
          while (true) {
            const val = getCookie(`${name}.${chunk}`);
            if (!val) break;
            combined += val;
            chunk++;
          }
          if (combined) cookieVal = combined;
        }

        // 3. Sync cookie to localStorage if they differ
        if (cookieVal && cookieVal !== localVal) {
          window.localStorage.setItem(storageKey, cookieVal);
          return cookieVal;
        }

        // 4. PWA Revive (standalone mode)
        // If cookies are gone (e.g. app reopened after backgrounding), use localStorage
        return localVal ?? cookieVal ?? '';
      },
      set(name: string, value: string, cookieOptions: CookieOptions) {
        if (typeof window === 'undefined') return;
        const storageKey = name.startsWith('sb-') ? name : `sb-${name}`;
        window.localStorage.setItem(storageKey, value);
        
        // Set cookie
        let cookieString = `${name}=${value}; path=${cookieOptions.path || '/'};`;
        if (cookieOptions.maxAge) cookieString += ` max-age=${cookieOptions.maxAge};`;
        if (cookieOptions.domain) cookieString += ` domain=${cookieOptions.domain};`;
        if (cookieOptions.secure) cookieString += ` secure;`;
        cookieString += ` SameSite=${cookieOptions.sameSite || 'Lax'};`;
        document.cookie = cookieString;
      },
      remove(name: string, cookieOptions: CookieOptions) {
        if (typeof window === 'undefined') return;
        const storageKey = name.startsWith('sb-') ? name : `sb-${name}`;
        window.localStorage.removeItem(storageKey);
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
