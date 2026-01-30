"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Hero() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);
      }
    };
    checkUser();
  }, [supabase]);

  return (
    <section className="relative pt-6 pb-12 lg:pt-20 lg:pb-32 overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      {/* Enhanced Background with Grain Texture */}
      <div className="absolute inset-0 -z-10">
        {/* Noise texture overlay for brutalist authenticity */}
        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]" />
        
        {/* Bold Color Blobs - More Visible */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#FF6B35] rounded-full blur-3xl opacity-30 animate-blob" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-[#4ECDC4] rounded-full blur-3xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-[#FFE66D] rounded-full blur-3xl opacity-25 animate-blob animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Column - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-5 lg:space-y-8 text-center lg:text-left"
          >
            {/* Badge - More Specific */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-2xl bg-white border-3 border-black font-display font-bold text-[10px] lg:text-sm neo-shadow">
              <span className="text-sm lg:text-lg">🎯</span>
              <span>For College Students Who Value Their Time</span>
            </div>

            {/* Headline - CLEAR VALUE (2026 Playbook) */}
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-display font-black tracking-tight text-foreground leading-[1.1]">
              Never Fall Below{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[#FF6B35]">75%</span>
                <span className="absolute -bottom-2 left-0 right-0 h-3 lg:h-4 bg-[#FFE66D] -rotate-1 -z-0" />
              </span>
              {" "}Attendance
            </h1>

            {/* Sub-Headline - WHO + WHAT + RESULT */}
            <div className="space-y-3 lg:space-y-4">
              <p className="text-base lg:text-2xl text-foreground/80 leading-relaxed font-medium max-w-xl mx-auto lg:mx-0">
                AI-powered attendance tracker + smart bunk calculator.
              </p>
              <p className="text-sm lg:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                Know <strong className="text-foreground">exactly</strong> how many classes you can safely skip. No guesswork. No detention. 📊
              </p>
            </div>

            {/* Single Primary CTA + Trust Signal */}
            <div className="space-y-5 lg:space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link href={isAuthenticated ? "/dashboard" : "/login"} className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto h-11 lg:h-16 px-8 lg:px-10 text-sm lg:text-lg font-display font-black rounded-2xl neo-shadow-lg hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white border-3 border-black"
                  >
                    Start Tracking Free <ArrowRight className="ml-2 h-4 w-4 lg:h-5 lg:w-5" />
                  </Button>
                </Link>
                <Link href="#how-it-works" className="text-xs lg:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors underline">
                  See how it works →
                </Link>
              </div>

              {/* Trust Signal - Critical for 2026 */}
              <div className="flex flex-col items-center lg:items-start gap-3">
                <div className="flex items-center gap-2 text-xs lg:text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                  <span className="font-semibold text-foreground">Free forever</span>
                  <span>• No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-[#FF6B35] border-2 border-white flex items-center justify-center text-[10px] lg:text-xs font-bold text-white">A</div>
                    <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-[#4ECDC4] border-2 border-white flex items-center justify-center text-[10px] lg:text-xs font-bold text-white">R</div>
                    <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-[#FFE66D] border-2 border-white flex items-center justify-center text-[10px] lg:text-xs font-bold">S</div>
                    <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-primary border-2 border-white flex items-center justify-center text-[10px] lg:text-xs font-bold text-white">+</div>
                  </div>
                  <p className="text-xs lg:text-sm font-medium text-muted-foreground">
                    <strong className="text-foreground">10,000+</strong> students staying safe
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Benefits - Feature Pills */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-2 lg:gap-3 pt-2 lg:pt-4">
              <div className="px-2.5 py-1 lg:px-4 lg:py-2 rounded-xl bg-white border-2 border-black font-display font-bold text-[10px] lg:text-sm neo-shadow-sm hover:translate-y-0.5 transition-transform">
                ✨ Works with ANY portal
              </div>
              <div className="px-2.5 py-1 lg:px-4 lg:py-2 rounded-xl bg-white border-2 border-black font-display font-bold text-[10px] lg:text-sm neo-shadow-sm hover:translate-y-0.5 transition-transform">
                🚀 Setup in 30 seconds
              </div>
              <div className="px-2.5 py-1 lg:px-4 lg:py-2 rounded-xl bg-white border-2 border-black font-display font-bold text-[10px] lg:text-sm neo-shadow-sm hover:translate-y-0.5 transition-transform">
                🎯 Zero detention risk
              </div>
            </div>
          </motion.div>

          {/* Right Column - VISUAL PROOF (Critical 2026 Addition) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Product Screenshot Mockup */}
            <div className="relative rounded-3xl border-4 border-black bg-white neo-shadow-xl overflow-hidden rotate-1 hover:rotate-0 transition-transform duration-300">
              {/* Header Bar */}
              <div className="bg-[#FF6B35] px-6 py-4 border-b-4 border-black flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-white border-2 border-black" />
                  <div className="w-3 h-3 rounded-full bg-white border-2 border-black" />
                  <div className="w-3 h-3 rounded-full bg-white border-2 border-black" />
                </div>
                <span className="font-display font-bold text-white text-sm">Dashboard</span>
              </div>
              
              {/* Dashboard Content Preview */}
              <div className="p-6 space-y-4 bg-gradient-to-br from-white to-gray-50">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-white border-2 border-black">
                    <div className="text-3xl font-black text-[#FF6B35]">78%</div>
                    <div className="text-xs font-bold text-muted-foreground">Overall</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border-2 border-black">
                    <div className="text-3xl font-black text-green-600">12</div>
                    <div className="text-xs font-bold text-muted-foreground">Safe Bunks</div>
                  </div>
                </div>

                {/* Subject List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border-2 border-black">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-bold">Data Structures</span>
                    </div>
                    <span className="text-sm font-black text-green-600">82%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border-2 border-black">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-sm font-bold">Algorithms</span>
                    </div>
                    <span className="text-sm font-black text-yellow-600">76%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border-2 border-black">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-bold">Database Systems</span>
                    </div>
                    <span className="text-sm font-black text-green-600">85%</span>
                  </div>
                </div>

                {/* Bunk Calculator Preview */}
                <div className="p-4 rounded-2xl bg-[#4ECDC4]/10 border-2 border-[#4ECDC4]">
                  <div className="text-xs font-bold text-[#4ECDC4] mb-2">🎯 SAFE ZONE</div>
                  <div className="text-sm font-medium text-foreground">You can safely bunk <strong className="text-lg">4 more classes</strong> this month</div>
                </div>
              </div>
            </div>

            {/* Floating Elements for Visual Interest */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#FFE66D] rounded-2xl border-3 border-black neo-shadow flex items-center justify-center text-3xl rotate-12 animate-bounce-slow">
              🎉
            </div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-[#4ECDC4] rounded-full border-3 border-black neo-shadow flex items-center justify-center text-2xl -rotate-12">
              ✅
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
