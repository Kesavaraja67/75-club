"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, Calendar, Sparkles, ArrowRight, BarChart3, Target, Zap } from "lucide-react";
import Link from "next/link";
import { fetchSubscriptionStatus } from "@/lib/subscription";

export default function ProfilePage() {
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
  
        // 1. Fetch Name from Profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('user_id', user.id)
          .single();
  
        if (profile) {
          setName(profile.name);
        } else {
          setName(user.user_metadata?.name || "");
        }

        // 2. Fetch Subscription Status using shared utility
        const { tier } = await fetchSubscriptionStatus(user.id, supabase);
        setTier(tier);
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-black" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Welcome Section */}
      <div className="text-center mb-6">
        <h2 className="text-3xl md:text-5xl font-display font-black text-black mb-2">
          Welcome back, {name}! 👋
        </h2>
        <p className="text-base md:text-xl text-gray-600 font-medium">
          Ready to master your attendance strategy?
        </p>
      </div>

      {/* Profile Card */}
      <Card className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Profile Icon */}
            <div className="bg-black p-6 md:p-8 rounded-full border-4 border-black">
              <User className="h-12 w-12 md:h-16 md:w-16 text-white" />
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left space-y-3 md:space-y-4 w-full">
              <div>
                <h3 className="text-2xl md:text-3xl font-display font-black text-black">{name}</h3>
                <p className="text-gray-600 font-medium text-base md:text-lg break-all">{email}</p>
              </div>

              <div className="flex flex-wrap gap-3 md:gap-4 justify-center md:justify-start">
                <div className="flex items-center gap-2 bg-gray-100 px-3 md:px-4 py-2 rounded-xl border-2 border-gray-300">
                  <Calendar className="h-4 w-4 text-gray-600 flex-shrink-0" />
                  <span className="text-xs md:text-sm font-medium text-gray-700">Joined {createdAt}</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 px-3 md:px-4 py-2 rounded-xl border-2 border-gray-300">
                  <Sparkles className="h-4 w-4 text-gray-600 flex-shrink-0" />
                  <span className="text-xs md:text-sm font-medium text-gray-700">{tier === 'pro' ? 'Pro Plan' : 'Free Plan'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
          <CardContent className="p-4 md:p-6 text-center">
            <Target className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-blue-600" />
            <h3 className="text-lg md:text-xl font-display font-black mb-1 md:mb-2">Track Attendance</h3>
            <p className="text-gray-600 text-xs md:text-sm">Monitor all your subjects in real-time</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
          <CardContent className="p-4 md:p-6 text-center">
            <BarChart3 className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-purple-600" />
            <h3 className="text-lg md:text-xl font-display font-black mb-1 md:mb-2">View Analytics</h3>
            <p className="text-gray-600 text-xs md:text-sm">Get insights on your attendance trends</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
          <CardContent className="p-4 md:p-6 text-center">
            <Zap className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-orange-600" />
            <h3 className="text-lg md:text-xl font-display font-black mb-1 md:mb-2">AI Scanning</h3>
            <p className="text-gray-600 text-xs md:text-sm">Upload screenshots for instant tracking</p>
          </CardContent>
        </Card>
      </div>

      {/* CTA to Dashboard */}
      <div className="text-center pt-4">
        <Link href="/dashboard">
          <Button 
            size="lg" 
            className="w-full md:w-auto text-lg md:text-xl px-8 md:px-12 py-6 md:py-8 rounded-2xl bg-black text-white hover:bg-gray-800 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all font-display font-black"
          >
            Enter Dashboard <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6" />
          </Button>
        </Link>
        <p className="mt-3 text-gray-500 text-xs md:text-sm">Click to access your full dashboard</p>
      </div>
    </div>
  );
}
