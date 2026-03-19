"use client";

import Hero from "@/components/landing/Hero";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Star } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

import UpgradeDialog from "@/components/subscription/UpgradeDialog"; // Import UpgradeDialog
import { useRouter } from "next/navigation"; // Import useRouter
import { fetchSubscriptionStatus } from "@/lib/subscription";

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProUser, setIsProUser] = useState(false);
  const [openUpgrade, setOpenUpgrade] = useState(false); // Add state for upgrade dialog
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!isMounted) return;

        if (!user) {
          setIsAuthenticated(false);
          setIsProUser(false);
          return;
        }

        const subStatus = await fetchSubscriptionStatus(user.id);
        if (!isMounted) return;
        setIsAuthenticated(true);
        setIsProUser(subStatus.isProUser);
      } catch {
        if (!isMounted) return;
        setIsAuthenticated(false);
        setIsProUser(false);
      }
    };
    checkUser();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  return (
    <div className="min-h-screen bg-background">
      <main>
        <Hero />

        {/* Social Proof Section - NEW (2026 Playbook Priority) */}
        <section className="py-12 border-y bg-muted/10">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              <div className="text-center">
                <div className="text-4xl font-display font-black text-foreground mb-1">10,000+</div>
                <div className="text-sm font-medium text-muted-foreground">Students Protected</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-display font-black text-foreground mb-1">50,000+</div>
                <div className="text-sm font-medium text-muted-foreground">Classes Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-display font-black text-foreground mb-1">4.9/5</div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <div className="text-sm font-medium text-muted-foreground">Student Rating</div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section - NEW (Trust Building) */}
        <section className="py-16 bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-black mb-3">
                What Students Say 💬
              </h2>
              <p className="text-muted-foreground text-lg">Real reviews from real students</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-3xl border-3 border-black neo-shadow">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground font-medium mb-4">
                  &quot;Finally stopped getting detention notices! This app saved my semester.&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FF6B35] border-2 border-black flex items-center justify-center font-bold text-white">
                    A
                  </div>
                  <div>
                    <div className="font-bold text-sm">Arjun M.</div>
                    <div className="text-xs text-muted-foreground">IIT Delhi, CSE</div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-3xl border-3 border-black neo-shadow">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground font-medium mb-4">
                  &quot;The AI scanning is magic. Uploaded my portal screenshot and boom - everything was there!&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#4ECDC4] border-2 border-black flex items-center justify-center font-bold text-white">
                    P
                  </div>
                  <div>
                    <div className="font-bold text-sm">Priya S.</div>
                    <div className="text-xs text-muted-foreground">VIT Vellore, ECE</div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-3xl border-3 border-black neo-shadow">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground font-medium mb-4">
                  &quot;No more Excel sheets! I can see exactly how many bunks I have left. Game changer!&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FFE66D] border-2 border-black flex items-center justify-center font-bold">
                    R
                  </div>
                  <div>
                    <div className="font-bold text-sm">Rohan K.</div>
                    <div className="text-xs text-muted-foreground">SRM Chennai, IT</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works - IMPROVED */}
        <section id="how-it-works" className="py-20 bg-muted/20">
          <div className="container mx-auto px-4 text-center max-w-5xl">
            <h2 className="text-4xl md:text-5xl font-display font-black mb-3">
              Setup in 30 Seconds 🚀
            </h2>
            <p className="text-muted-foreground text-xl mb-16 max-w-2xl mx-auto">
              No manual entry. No complex setup. Just <strong>snap, scan, and chill</strong>.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="relative">
                <div className="p-8 bg-white rounded-3xl border-4 border-black neo-shadow hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                  <div className="text-6xl mb-4">📸</div>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FF6B35] text-white font-black text-xl mb-3 border-3 border-black">
                    1
                  </div>
                  <h3 className="font-display font-black text-2xl mb-3">Snap Portal</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Take a screenshot of your college attendance portal. Any format works.
                  </p>
                </div>
                {/* Connector Arrow */}
                <div className="hidden md:block absolute top-1/2 -right-4 text-4xl">→</div>
              </div>

              <div className="relative">
                <div className="p-8 bg-white rounded-3xl border-4 border-black neo-shadow hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                  <div className="text-6xl mb-4">🤖</div>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#4ECDC4] text-white font-black text-xl mb-3 border-3 border-black">
                    2
                  </div>
                  <h3 className="font-display font-black text-2xl mb-3">AI Extracts</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our AI reads your screenshot and imports all subjects, attendance, and totals instantly.
                  </p>
                </div>
                {/* Connector Arrow */}
                <div className="hidden md:block absolute top-1/2 -right-4 text-4xl">→</div>
              </div>

              <div className="p-8 bg-white rounded-3xl border-4 border-black neo-shadow hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                <div className="text-6xl mb-4">🎯</div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FFE66D] text-black font-black text-xl mb-3 border-3 border-black">
                  3
                </div>
                <h3 className="font-display font-black text-2xl mb-3">Stay Safe</h3>
                <p className="text-muted-foreground leading-relaxed">
                  See your safe bunk count for each subject. Never fall below 75% again.
                </p>
              </div>
            </div>

            <Link href={isAuthenticated ? "/dashboard" : "/login"}>
              <Button size="lg" className="h-14 px-10 text-lg font-display font-bold rounded-2xl neo-shadow-lg hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                Start Tracking Free 🎉
              </Button>
            </Link>
          </div>
        </section>

        {/* Features - IMPROVED (Benefits, not features) */}
        <section id="features" className="py-20 bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4 text-center max-w-6xl">
            <h2 className="text-4xl md:text-5xl font-display font-black mb-3">
              Everything You Need to Bunk Safely 🛡️
            </h2>
            <p className="text-muted-foreground text-xl mb-16 max-w-2xl mx-auto">
              Not just tracking - <strong>smart planning</strong> that keeps you above 75%.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 bg-white rounded-3xl border-4 border-black neo-shadow card-bounce text-left">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="text-2xl font-display font-bold mb-3">Safe Bunk Calculator</h3>
                <p className="text-foreground/70 font-medium leading-relaxed mb-4">
                  See exactly how many classes you can skip per subject. Real-time calculations that update with every attendance entry.
                </p>
                <div className="inline-flex items-center gap-2 text-sm font-bold text-[#FF6B35]">
                  <CheckCircle2 className="w-4 h-4" />
                  Never below 75%
                </div>
              </div>

              <div className="p-8 bg-white rounded-3xl border-4 border-black neo-shadow card-bounce text-left">
                <div className="text-5xl mb-4">📸</div>
                <h3 className="text-2xl font-display font-bold mb-3">Instant AI Scanning</h3>
                <p className="text-foreground/70 font-medium leading-relaxed mb-4">
                  No manual typing. Upload your portal screenshot and we extract everything in 3 seconds. Works with ANY college portal.
                </p>
                <div className="inline-flex items-center gap-2 text-sm font-bold text-[#4ECDC4]">
                  <CheckCircle2 className="w-4 h-4" />
                  Zero manual work
                </div>
              </div>

              <div className="p-8 bg-white rounded-3xl border-4 border-black neo-shadow card-bounce text-left">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-2xl font-display font-bold mb-3">Live Dashboard</h3>
                <p className="text-foreground/70 font-medium leading-relaxed mb-4">
                  Beautiful, clean interface showing all subjects, percentages, and safe bunks. No ads, no clutter, just your data.
                </p>
                <div className="inline-flex items-center gap-2 text-sm font-bold text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Always up-to-date
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing - IMPROVED */}
        <section id="pricing" className="py-20 bg-muted/20">
          <div className="container mx-auto px-4 text-center max-w-4xl">
            <h2 className="text-4xl md:text-5xl font-display font-black mb-3">
              Simple Pricing 💰
            </h2>
            <p className="text-muted-foreground text-xl mb-12">
              One plan. All features. <strong className="text-foreground">Forever free</strong> for basic tracking.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Free Plan */}
              <div className="p-8 bg-white rounded-3xl border-4 border-black neo-shadow-lg text-left">
                <div className="text-4xl mb-3">🎉</div>
                <h3 className="text-2xl font-display font-black mb-2">Free Forever</h3>
                <div className="text-5xl font-display font-black my-6">
                  ₹0<span className="text-xl text-muted-foreground">/forever</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Start Tracking Free</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Basic bunk calculator</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Live dashboard</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Link href={isAuthenticated ? "/dashboard" : "/login"}>
                  <Button variant="outline" size="lg" className="w-full font-display font-bold text-lg h-14 rounded-2xl border-3 border-black">
                    Start Free
                  </Button>
                </Link>
              </div>

              {/* Pro Plan */}
              <div className="relative p-8 bg-gradient-to-br from-[#FF6B35] to-[#FF6B35]/80 text-white rounded-3xl border-4 border-black neo-shadow-xl text-left">
                <div className="absolute -top-4 right-8 px-4 py-1 bg-[#FFE66D] text-black rounded-full text-sm font-black border-2 border-black">
                  MOST POPULAR
                </div>
                <div className="text-4xl mb-3">🚀</div>
                <h3 className="text-2xl font-display font-black mb-2">Pro Plan</h3>
                <div className="flex items-baseline gap-1 my-6 font-display font-black">
                  <span className="text-5xl">₹249</span>
                  <span className="text-xl opacity-80">/semester</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">Unlimited AI scans</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">Advanced predictions</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">Multi-semester history</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">Priority support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">Export reports (PDF)</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => {
                    if (!isAuthenticated) router.push('/login');
                    else if (isProUser) router.push('/dashboard');
                    else setOpenUpgrade(true);
                  }}
                  size="lg" 
                  className={`w-full font-display font-bold text-lg h-14 rounded-2xl border-3 border-black transition-all ${
                    isProUser 
                      ? "bg-[#FFE66D] text-black hover:bg-[#FFE66D]/90 cursor-pointer" 
                      : "bg-white text-[#FF6B35] hover:bg-white/90"
                  }`}
                >
                  {isProUser ? "Go to Dashboard" : "Upgrade to Pro"}
                </Button>
                <p className="text-center text-sm mt-3 opacity-90">
                  Secure payment via Razorpay • One-time payment
                </p>
              </div>
            </div>

            <p className="text-muted-foreground mt-8 text-sm">
              💡 ₹249/semester vs ₹500 detention fine. Easy choice.
            </p>
          </div>
        </section>

        {/* Final CTA Section - NEW */}
        <section className="py-20 bg-gradient-to-b from-muted/20 to-background">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <div className="p-12 bg-white rounded-3xl border-4 border-black neo-shadow-xl">
              <h2 className="text-4xl md:text-5xl font-display font-black mb-4">
                Ready to Bunk Smartly? 🎯
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
                Join 10,000+ students who never worry about attendance anymore.
              </p>
            <Link href={isAuthenticated ? "/dashboard" : "/login"}>
                <Button size="lg" className="h-16 px-12 text-lg font-display font-black rounded-2xl neo-shadow-lg hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#FF6B35] text-white border-3 border-black">
                  Start Free Now →
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground mt-4">
                No credit card required • Setup in 30 seconds • Cancel anytime
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t bg-muted/10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/app-logo.png" alt="75 Club Logo" width={32} height={32} className="object-contain" />
            <span className="font-display font-black text-xl">75 Club</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} 75 Club. Helping students stay above 75% since 2024.
          </p>
        </div>
      </footer>
      <UpgradeDialog 
        open={openUpgrade} 
        onOpenChange={setOpenUpgrade} 
      />
    </div>
  );
}
