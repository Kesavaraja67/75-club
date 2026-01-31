"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, Calendar, Sparkles, ArrowRight, BarChart3, Target, Zap } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [createdAt, setCreatedAt] = useState<string>("");
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/");
          return;
        }
  
        setEmail(user.email || "");
        setCreatedAt(new Date(user.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }));
  
        // Fetch profile from database
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
  
        if (profile) {
          setName(profile.name);
          setTier(profile.subscription_tier as "free" | "pro");
        } else {
          setName(user.user_metadata?.name || "");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-black" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-4 border-black bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl">📚</div>
            <h1 className="text-2xl font-display font-black">75 Club</h1>
          </div>
          {tier === 'pro' && (
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-2 rounded-full text-sm font-black border-2 border-black shadow-sm flex items-center gap-1">
              <Sparkles className="h-4 w-4" /> PRO
            </span>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Welcome Section */}
        <div className="text-center mb-12 animate-in fade-in duration-700">
          <h2 className="text-5xl md:text-6xl font-display font-black text-black mb-4">
            Welcome back, {name}! 👋
          </h2>
          <p className="text-xl text-gray-600 font-medium">
            Ready to master your attendance strategy?
          </p>
        </div>

        {/* Profile Card */}
        <Card className="bg-white border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] mb-12 animate-in slide-in-from-bottom duration-700">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Profile Icon */}
              <div className="bg-black p-8 rounded-full border-4 border-black">
                <User className="h-16 w-16 text-white" />
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <h3 className="text-3xl font-display font-black text-black">{name}</h3>
                  <p className="text-gray-600 font-medium text-lg">{email}</p>
                </div>

                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl border-2 border-gray-300">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Joined {createdAt}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl border-2 border-gray-300">
                    <Sparkles className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{tier === 'pro' ? 'Pro Plan' : 'Free Plan'}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
            <CardContent className="p-6 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <h3 className="text-xl font-display font-black mb-2">Track Attendance</h3>
              <p className="text-gray-600 text-sm">Monitor all your subjects in real-time</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <h3 className="text-xl font-display font-black mb-2">View Analytics</h3>
              <p className="text-gray-600 text-sm">Get insights on your attendance trends</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
            <CardContent className="p-6 text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 text-orange-600" />
              <h3 className="text-xl font-display font-black mb-2">AI Scanning</h3>
              <p className="text-gray-600 text-sm">Upload screenshots for instant tracking</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA to Dashboard */}
        <div className="text-center animate-in slide-in-from-bottom duration-700 delay-200">
          <Link href="/dashboard">
            <Button 
              size="lg" 
              className="text-xl px-12 py-8 rounded-2xl bg-black text-white hover:bg-gray-800 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all font-display font-black"
            >
              Enter Dashboard <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
          <p className="mt-4 text-gray-500 text-sm">Click to access your full dashboard</p>
        </div>
      </main>
    </div>
  );
}
