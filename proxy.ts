import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { supabaseFetchWithTimeout } from '@/lib/fetch-with-timeout'

// Next.js 16: the function MUST be named "proxy" (not "middleware")
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: supabaseFetchWithTimeout,
      },
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh the session so cookies stay valid.
  // Wrapped in try/catch: in local dev the Edge/Node runtime
  // sometimes can't reach Supabase. Let the request through
  // anyway — page-level auth checks will handle it.
  try {
    const { error } = await supabase.auth.getUser()
    
    // If we receive a definitive auth error (like invalid token), sign out.
    // Transport/fetch errors will just pass through without disrupting the session.
    if (error && error.status && (error.status === 401 || error.status === 403)) {
      await supabase.auth.signOut()
    }
  } catch {
    // If getUser throws entirely (e.g. transport timeout), just act as passthrough
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}