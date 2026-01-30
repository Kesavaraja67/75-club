"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  // Get redirect path, ensuring it's relative
  const rawRedirect = searchParams.get("redirect") || "/";
  const redirectPath = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";

  // Redirect if already logged in - CRITICAL AUTH GUARD
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!isMounted) return;
        
        if (user) {
          // User is logged in - redirect immediately
          router.replace(redirectPath);
        } else {
          // User is not logged in - show form
          setCheckingAuth(false);
        }
      } catch (err) {
        console.error("Auth check error:", err);
        if (isMounted) {
          setCheckingAuth(false);
        }
      }
    };
    
    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [router, supabase, redirectPath]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Trim email to avoid whitespace issues
      const trimmedEmail = email.trim().toLowerCase();
      
      // Attempt signup
      const { data, error: signupError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
          data: {
            name: name.trim(),
          },
        },
      });

      if (signupError) {
        // Handle specific error cases
        if (signupError.message.toLowerCase().includes("already") || 
            signupError.message.toLowerCase().includes("registered") ||
            signupError.message.toLowerCase().includes("user already exists")) {
          setError("This email is already registered. Please login instead.");
        } else {
          setError(signupError.message);
        }
        setLoading(false);
      } else {
        // Check if user was created successfully
        if (data.user) {
          // Check if email confirmation is required
          if (data.user.identities && data.user.identities.length === 0) {
            // User exists but hasn't confirmed email
            setError("This email is already registered. Please check your email to confirm your account or login.");
            setLoading(false);
          } else {
            // Successful signup
            setSuccess(true);
            setLoading(false);
          }
        } else {
          // Edge case: no error but no user created
          setError("An unexpected error occurred. Please try again.");
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-3xl">
          <CardHeader>
            <CardTitle className="text-3xl font-display font-black text-center">Check your email</CardTitle>
            <CardDescription className="text-center font-medium text-gray-600">
              We&apos;ve sent a confirmation link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
             <div className="h-20 w-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-4xl border-2 border-black">
               ✉️
             </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href={`/login?redirect=${encodeURIComponent(redirectPath)}`}>
              <Button variant="outline" className="border-2 border-black hover:bg-gray-100 font-bold rounded-xl">Back to Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-3xl">
        <CardHeader>
          <CardTitle className="text-3xl font-display font-black text-center">Create an account</CardTitle>
          <CardDescription className="text-center font-medium text-gray-600">
            Start tracking your attendance today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-bold">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border-2 border-black rounded-xl focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-black"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-2 border-black rounded-xl focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-black"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="border-2 border-black rounded-xl focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-black"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>
            
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border-2 border-red-200 rounded-xl font-medium">
                {error}
                {error.toLowerCase().includes("already registered") && (
                  <Link href={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="block mt-2 text-red-700 underline font-bold">
                    Go to Login →
                  </Link>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full font-bold text-lg rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all" 
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign Up
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm font-medium text-gray-600">
            Already have an account?{" "}
            <Link href={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="text-primary hover:underline font-bold text-black">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="h-8 w-8 animate-spin text-black" /></div>}>
      <SignupForm />
    </Suspense>
  );
}