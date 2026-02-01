"use client";

import { useState, Suspense, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${location.origin}/api/auth/callback?next=/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
      } else {
        setSuccess(true);
        setLoading(false);
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-3xl">
          <CardHeader>
            <CardTitle className="text-3xl font-display font-black text-center">Check your email</CardTitle>
            <CardDescription className="text-center font-medium text-gray-600">
              We&apos;ve sent a password reset link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
             <div className="h-20 w-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-4xl border-2 border-black">
               ✉️
             </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/login">
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
          <CardTitle className="text-3xl font-black text-center">Reset Password</CardTitle>
          <CardDescription className="text-center font-medium text-gray-600">
            Enter your email to receive a reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
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
            
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full font-bold text-lg rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-black">
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="h-8 w-8 animate-spin text-black dark:text-white" /></div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
