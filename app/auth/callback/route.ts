import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'
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
    const supabase = await createClient()
    
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`
        )
      }

      if (data.session) {
        // Successful authentication - redirect to destination
        const redirectUrl = `${origin}${next}`
        console.log('Successful auth, redirecting to:', redirectUrl)
        
        // Create response with redirect
        const response = NextResponse.redirect(redirectUrl)
        
        // Set secure headers
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
        
        return response
      }
    } catch (err) {
      console.error('Unexpected auth error:', err)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('An unexpected error occurred.')}`
      )
    }
  }

  // No code provided - redirect to login
  console.log('No code provided in callback')
  return NextResponse.redirect(`${origin}/login`)
}