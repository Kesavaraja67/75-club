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
        const localVal = window.localStorage.getItem(`sb-${name}`);
        if (localVal) return localVal;
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = document.cookie.match(new RegExp('(^| )' + escapedName + '=([^;]+)'));
        return match ? match[2] : '';
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
        document.cookie = `${name}=; path=${cookieOptions.path || '/'}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
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
