"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export default function OnboardingPage() {
  const [name, setName] = useState("there");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setName(user.user_metadata?.name || "Buddy");
      }
    };
    fetchUser();
  }, [supabase]);

  const handleStart = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="space-y-8 animate-in slide-in-from-left duration-700">
          <div>
            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold border-2 border-yellow-400 mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Welcome to 75 Club</span>
            </div>
            <h1 className="text-5xl font-display font-black text-black leading-tight mb-4">
              Hey, {name}! 👋
            </h1>
            <p className="text-xl text-gray-600 font-medium leading-relaxed">
              Ready to master the art of strategic bunking? Let&apos;s get your dashboard set up in seconds.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-2 rounded-full border-2 border-green-400 mt-1">
                <CheckCircle2 className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-black">Track Attendance</h3>
                <p className="text-gray-600">Know exactly when you can skip without trouble.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-2 rounded-full border-2 border-blue-400 mt-1">
                <CheckCircle2 className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-black">Smart AI Scanning</h3>
                <p className="text-gray-600">Upload portal screenshots (Pro) or add manually.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-purple-100 p-2 rounded-full border-2 border-purple-400 mt-1">
                <CheckCircle2 className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-black">Stay Safe</h3>
                <p className="text-gray-600">Get alerts when you&apos;re cutting it close.</p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              onClick={handleStart}
              size="lg" 
              className="text-lg px-8 py-6 rounded-2xl bg-black text-white hover:bg-gray-800 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-y-1 transition-all"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Right Visual */}
        <div className="relative animate-in slide-in-from-right duration-700 delay-200 hidden md:block">
          <Card className="bg-white border-4 border-black rounded-3xl shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] rotate-3 overflow-hidden">
            <CardContent className="p-0">
               <div className="bg-gray-100 p-4 border-b-4 border-black flex items-center justify-between">
                 <div className="flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-400 border border-black"></div>
                   <div className="w-3 h-3 rounded-full bg-yellow-400 border border-black"></div>
                   <div className="w-3 h-3 rounded-full bg-green-400 border border-black"></div>
                 </div>
                 <div className="text-xs font-bold text-gray-500">DASHBOARD_PREVIEW.EXE</div>
               </div>
               <div className="p-8 space-y-6 bg-white">
                 <div className="flex justify-between items-center">
                   <div>
                     <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                     <div className="h-3 w-24 bg-gray-100 rounded animate-pulse"></div>
                   </div>
                   <div className="h-10 w-10 bg-black rounded-xl"></div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="h-32 bg-gray-50 rounded-xl border-2 border-gray-200"></div>
                   <div className="h-32 bg-gray-50 rounded-xl border-2 border-gray-200"></div>
                 </div>
                 <div className="h-24 bg-gray-900 rounded-xl opacity-10"></div>
               </div>
            </CardContent>
          </Card>
          
          {/* Decor elements */}
          <div className="absolute -top-6 -right-6 text-6xl animate-bounce delay-700">🚀</div>
          <div className="absolute -bottom-8 -left-8 text-6xl animate-bounce delay-1000">✨</div>
        </div>
      </div>
    </div>
  );
}
