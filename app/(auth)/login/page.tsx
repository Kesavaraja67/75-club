"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  
  // Get redirect path, ensuring it's relative to prevent Open Redirects
  const rawRedirect = searchParams.get("redirect") || "/";
  const redirectPath = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";
  const safeRedirect = redirectPath === pathname ? "/" : redirectPath;

  // Redirect if already logged in
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!isMounted) return;
        
        if (user) {
          router.replace(safeRedirect);
        } else {
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
  }, [router, supabase, safeRedirect]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Trim and lowercase email to avoid issues
      const trimmedEmail = email.trim().toLowerCase();

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (loginError) {
        console.error("Login Error:", loginError);
        
        // Provide user-friendly error messages
        if (loginError.message.toLowerCase().includes("invalid") || 
            loginError.message.toLowerCase().includes("credentials")) {
          setError("Invalid email or password. Please check your credentials and try again.");
        } else if (loginError.message.toLowerCase().includes("email not confirmed")) {
          setError("Please confirm your email address. Check your inbox for the confirmation link.");
        } else {
          setError(loginError.message);
        }
        setLoading(false);
      } else {
        // Successful login
        if (data.user) {
          // Force a refresh to update the session
          // Wait for auth cookies to be written to disk.
          // Critical on mobile — cookie writes are async and slow.
          await new Promise((resolve) => setTimeout(resolve, 150));
          // Use replace (not push) to avoid polluting browser history.
          router.replace(safeRedirect);
          // DO NOT call router.refresh() here.
          // The proxy.ts session refresh runs on every request automatically.
        } else {
          setError("Login failed. Please try again.");
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Unexpected login error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-black dark:text-white" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-3xl">
        <CardHeader>
          <CardTitle className="text-3xl font-black text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center font-medium text-gray-600">
            Login to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="border-2 border-black rounded-xl focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-black"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-bold">Password</Label>
                <Link 
                  href="/forgot-password" 
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="border-2 border-black rounded-xl focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-black"
              />
            </div>
            
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200">
                <p className="text-sm text-red-600 font-medium">{error}</p>
                {error.toLowerCase().includes("confirm your email") && (
                  <p className="text-xs text-red-500 mt-2">
                    Didn&apos;t receive the email? Check your spam folder or{" "}
                    <Link href="/signup" className="underline font-bold">
                      sign up again
                    </Link>
                  </p>
                )}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full font-bold text-lg rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm font-medium text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href={`/signup?redirect=${encodeURIComponent(safeRedirect)}`} className="text-black hover:underline font-bold">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="h-8 w-8 animate-spin text-black dark:text-white" /></div>}>
      <LoginForm />
    </Suspense>
  );
}