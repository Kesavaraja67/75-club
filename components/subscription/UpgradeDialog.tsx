"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: unknown;
  }
}

interface RazorpayConstructor {
  new (options: unknown): { open: () => void };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
  feature?: string;
}

export default function UpgradeDialog({ open, onOpenChange, message, feature }: UpgradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpgrade = async () => {
    try {
      setLoading(true);

      // 1. Create order on backend
      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: "semester" }),
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      const { orderId, amount, currency, key } = await response.json();

      // 2. Initialize Razorpay
      const options = {
        key: key,
        amount: amount * 100, // Convert to paise
        currency: currency,
        name: "75 Club",
        description: "Pro Plan - Semester Access",
        order_id: orderId,
        handler: async function (response: RazorpayResponse) {
          // 3. Payment successful - verify on backend
          try {
            const verifyResponse = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (verifyResponse.ok) {
              toast.success("🎉 Welcome to Pro! Your subscription is now active.");
              onOpenChange(false);
              router.refresh(); // Refresh to update UI
            } else {
              toast.error("Payment verification failed. Please contact support.");
            }
          } catch (error) {
            toast.error("Verification error. Please contact support.");
            console.error(error);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast.info("Payment cancelled");
          },
        },
        prefill: {
          email: "", // Will be filled from user data
        },
        theme: {
          color: "#FF6B35", // Your brand color
        },
      };
      
      if (!window.Razorpay) {
        toast.error("Razorpay SDK failed to load. Please refresh and try again.");
        setLoading(false);
        return;
      }

      const razorpay = new (window.Razorpay as RazorpayConstructor)(options);
      razorpay.open();
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Failed to initiate payment. Please try again.");
      setLoading(false);
    }
  };

  const freeFeatures = [
    { name: "Up to 4 subjects", included: true },
    { name: "Manual attendance entry", included: true },
    { name: "Basic stats", included: true },
    { name: "AI Scan (OCR)", included: false },
    { name: "Calendar view", included: false },
    { name: "AI Buddy assistant", included: false },
  ];

  const proFeatures = [
    { name: "Unlimited subjects", included: true },
    { name: "Manual attendance entry", included: true },
    { name: "Full statistics", included: true },
    { name: "AI Scan (OCR)", included: true },
    { name: "Calendar view", included: true },
    { name: "AI Buddy assistant", included: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <div className="overflow-y-auto p-6 max-h-[90vh]">
          <DialogHeader className="border-b-2 border-black pb-4">
            <DialogTitle className="text-3xl font-display font-black text-black flex items-center gap-2">
              <Sparkles className="h-8 w-8" />
              Upgrade to Pro
            </DialogTitle>
            <DialogDescription className="text-gray-600 font-medium text-lg">
              {message || "Unlock all premium features and take your attendance tracking to the next level!"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {/* Feature Comparison */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* Free Tier */}
              <div className="border-2 border-gray-300 rounded-2xl p-6 bg-gray-50">
                <div className="mb-4">
                  <h3 className="text-xl font-display font-black text-black">Free</h3>
                  <p className="text-sm text-gray-600">Basic attendance tracking</p>
                </div>
                <div className="space-y-2">
                  {freeFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${feature.included ? 'text-black' : 'text-gray-400'}`}>
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro Tier */}
              <div className="border-4 border-black rounded-2xl p-6 bg-gradient-to-br from-yellow-50 to-orange-50 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <div className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold">
                    RECOMMENDED
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-display font-black text-black">Pro</h3>
                  <p className="text-sm text-gray-700 font-medium">Everything you need</p>
                </div>
                <div className="space-y-2 mb-4">
                  {proFeatures.map((f, index) => {
                     // Simple match: check if the feature name contains the passed feature string (or vice versa)
                     const isHighlighted = feature && (
                        f.name.toLowerCase().includes(feature.toLowerCase()) || 
                        feature.toLowerCase().includes(f.name.toLowerCase())
                     );
                     
                     return (
                        <div key={index} className={`flex items-center gap-2 ${isHighlighted ? 'bg-yellow-100/50 -mx-2 px-2 py-1 rounded-lg' : ''}`}>
                           <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                           <span className={`text-sm text-black ${isHighlighted ? 'font-black' : 'font-medium'}`}>
                           {f.name}
                           </span>
                        </div>
                     );
                  })}
                </div>
                <div className="mt-6 pt-4 border-t-2 border-black">
                  <div className="flex flex-col items-center">
                    <div className="flex items-baseline gap-1 justify-center">
                      <span className="text-4xl font-display font-black text-black">₹249</span>
                    </div>
                    <p className="text-sm font-bold text-black/80">per semester • one-time payment</p>
                    <div className="text-sm text-green-600 font-medium mt-2">
                       Cheaper than one movie ticket 🍿
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-black text-white rounded-2xl p-6 text-center">
              <h4 className="text-xl font-display font-black mb-2">Ready to upgrade?</h4>
              <p className="text-sm text-gray-300 mb-4">
                Join Pro users who never miss a class with AI-powered attendance tracking
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="bg-white text-black border-2 border-white hover:bg-gray-100 font-bold rounded-full h-12 px-8"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all h-12 px-8 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Upgrade to Pro"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
