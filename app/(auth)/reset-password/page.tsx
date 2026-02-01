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

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  
  // const router = useRouter(); // never used.
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      // If we have a code, we *could* exchange it, but the callback route usually handles it.
      // If we landed here from callback, we have a cookie.
      // We'll just verify a session exists.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Fallback: If no session, maybe we need to exchange code here?
        // (Only happens if link points directly to page, not callback)
        const code = searchParams.get("code");
        if (code) {
           const { error } = await supabase.auth.exchangeCodeForSession(code);
           if (error) setError("Invalid or expired link.");
        } else {
           setError("User not authenticated. Please request a new reset link.");
        }
      }
      setVerifying(false);
    };

    checkSession();
  }, [searchParams, supabase]);

  // No need to client-side exchange if we rely on the server session established by callback
  // But we allow it just in case the flow changes.
  // Ideally, valid session check happens on the server or middleware.
  
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // Import dynamically or use the imported action
      const { updatePassword } = await import("../actions");
      const result = await updatePassword(password);

      if (!result.success) {
        setError(result.message);
        setLoading(false);
      } else {
        setSuccess(true);
        setLoading(false);
      }
    } catch (err) {
      console.error("Update password error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-black dark:text-white" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-3xl">
          <CardHeader>
            <CardTitle className="text-3xl font-display font-black text-center">Password updated!</CardTitle>
            <CardDescription className="text-center font-medium text-gray-600">
              Your password has been successfully reset.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
             <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl border-2 border-black">
               ✓
             </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/login">
              <Button className="w-full font-bold text-lg rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all">
                Login with New Password
              </Button>
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
          <CardTitle className="text-3xl font-black text-center">Set New Password</CardTitle>
          <CardDescription className="text-center font-medium text-gray-600">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="border-2 border-black rounded-xl focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-black"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-bold">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="border-2 border-black rounded-xl focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-black"
              />
            </div>
            
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200">
                <p className="text-sm text-red-600 font-medium">{error}</p>
                {error.includes("expired") && (
                  <Link href="/forgot-password" className="block mt-2 underline font-bold">
                    Request new link
                  </Link>
                )}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full font-bold text-lg rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="h-8 w-8 animate-spin text-black dark:text-white" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
