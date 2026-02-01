import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Default to dashboard, fall back to / if not present
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth Error:', error, error_description)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({
              name,
              value,
              ...options,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
              path: '/',
            })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({
              name,
              ...options,
              sameSite: 'lax', 
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
              path: '/',
            })
          },
        },
      }
    )
    
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`
        )
      }

      // Successful authentication
      const redirectUrl = `${origin}${next}`
      
      const response = NextResponse.redirect(redirectUrl)
      
      // Prevent caching of the callback route
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      
      return response
      
    } catch (err) {
      console.error('Unexpected auth error:', err)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('An unexpected error occurred.')}`
      )
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
