"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { loadRazorpayScript } from "@/lib/razorpay-loader";
import { isInstalledPWA } from "@/lib/pwa-utils";
import { useRef } from "react";

/**
 * Payment State Machine
 */
type PaymentState = 
  | 'idle'           // Default, show Pay button
  | 'loading-sdk'    // Loading Razorpay script
  | 'creating-order' // Calling create-order API
  | 'modal-open'     // Razorpay modal is open (or redirecting)
  | 'verifying'      // Calling verify API  
  | 'success'        // Payment confirmed
  | 'pending'        // Paid but verification uncertain (check webhook)
  | 'failed';        // Payment failed or cancelled

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
  feature?: string;
}

interface UserPrefill {
  name: string;
  email: string;
  contact: string;
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: UserPrefill;
  theme: { color: string };
  modal: {
    backdropclose: boolean;
    escape: boolean;
    handleback: boolean;
    confirm_close: boolean;
    ondismiss: () => void;
  };
  handler: (response: RazorpayPaymentResponse) => void;
  redirect?: boolean;
  callback_url?: string;
}

interface RazorpayInstance {
  on: (event: string, callback: (resp: { error: { description: string } }) => void) => void;
  open: () => void;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

export default function UpgradeDialog({ open, onOpenChange, message, feature }: UpgradeDialogProps) {
  const [state, setState] = useState<PaymentState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  
  // Ref to track current state for callbacks (avoids stale closures)
  const stateRef = useRef<PaymentState>('idle');
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Reset state when dialog closes/opens
  useEffect(() => {
    if (!open) {
      // Don't reset if we just finished a success
      if (state !== 'success') {
        setState('idle');
        setErrorMessage(null);
      }
    }
  }, [open, state]);

  const handleUpgrade = async () => {
    try {
      setErrorMessage(null);
      
      // 1. Loading SDK
      setState('loading-sdk');
      await loadRazorpayScript();

      // 2. Creating Order
      setState('creating-order');
      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: "semester" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      const orderData = await response.json();
      const { orderId, amount, currency, key, user } = orderData;

      // 3. Configure Razorpay
      const isStandalone = isInstalledPWA();
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // CRITICAL: iOS PWA standalone mode needs redirect flow
      const useRedirectFlow = isStandalone && isIOS;

      const options: RazorpayOptions = {
        key: key,
        amount: amount * 100, // paise
        currency: currency,
        name: "75 Club",
        description: "Pro Plan - Semester Access",
        order_id: orderId,
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.contact,
        },
        theme: {
          color: "#FF6B35",
        },
        modal: {
          backdropclose: false,
          escape: false,
          handleback: true,
          confirm_close: true,
          ondismiss: () => {
            // Use ref to check current state reliably
            if (stateRef.current !== 'success' && stateRef.current !== 'verifying') {
              setState('idle');
              toast.info("Payment cancelled");
            }
          },
        },
        handler: async function (response: RazorpayPaymentResponse) {
          await handlePaymentSuccess(response);
        },
      };

      if (useRedirectFlow) {
        console.log("[Payment] Using redirect flow for iOS PWA");
        // Mark redirect in progress for better UX on return
        sessionStorage.setItem("razorpay_redirect_in_progress", "true");
        options.redirect = true;
        options.callback_url = `${window.location.origin}/api/payment/callback`;
      }

      // 4. Open Razorpay
      setState('modal-open');
      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', (resp) => {
        console.error("[Payment] Failed:", resp.error);
        setErrorMessage(resp.error.description || "Payment failed");
        setState('failed');
      });

      rzp.open();

    } catch (error: unknown) {
      console.error("[Payment] Setup Error:", error);
      const msg = error instanceof Error ? error.message : "An unexpected error occurred";
      setErrorMessage(msg);
      setState('failed');
    }
  };

  const handlePaymentSuccess = async (razorpayResponse: RazorpayPaymentResponse) => {
    try {
      setState('verifying');
      
      const verifyResponse = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
        }),
      });

      if (verifyResponse.ok) {
        const result = await verifyResponse.json();
        if (result.pending) {
          setState('pending');
        } else {
          setState('success');
          toast.success("🎉 Welcome to Pro!");
          // Small delay before closing/refreshing
          setTimeout(async () => {
            // Navigate first, then close to avoid "flash"
            await router.push('/dashboard?payment=success');
            onOpenChange(false);
          }, 2000);
        }
      } else {
        // Verification failed but payment was taken
        setState('pending');
      }
    } catch (error) {
      console.error("[Payment] Verification Error:", error);
      setState('pending');
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

  const isLoading = ['loading-sdk', 'creating-order', 'verifying', 'modal-open'].includes(state);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Prevent closing while processing/verifying
      if (['verifying', 'creating-order', 'loading-sdk'].includes(state)) return;
      onOpenChange(val);
    }}>
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
            {/* Status Overlays for UX */}
            {state === 'success' && (
              <div className="mb-6 p-4 bg-green-50 border-2 border-green-500 rounded-2xl flex items-center gap-4 text-green-800 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <h4 className="font-bold text-lg">Payment Successful!</h4>
                  <p className="text-sm">Welcome to the Pro Club. Your account is now active.</p>
                </div>
              </div>
            )}

            {state === 'pending' && (
              <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-500 rounded-2xl flex items-center gap-4 text-yellow-800 animate-in fade-in zoom-in duration-300">
                <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
                <div>
                  <h4 className="font-bold text-lg">Activation Pending...</h4>
                  <p className="text-sm">Payment received! Your Pro features are being unlocked. This usually takes 1-2 minutes.</p>
                </div>
              </div>
            )}

            {state === 'failed' && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex items-center gap-4 text-red-800 animate-in fade-in zoom-in duration-300">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <div>
                  <h4 className="font-bold text-lg">Payment Failed</h4>
                  <p className="text-sm">{errorMessage || "Something went wrong. Please try again or contact support."}</p>
                </div>
              </div>
            )}

            {/* Feature Comparison */}
            <div className={`grid md:grid-cols-2 gap-4 mb-6 transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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
                     const isHighlight = feature && (
                        f.name.toLowerCase().includes(feature.toLowerCase()) || 
                        feature.toLowerCase().includes(f.name.toLowerCase())
                     );
                     
                     return (
                        <div key={index} className={`flex items-center gap-2 ${isHighlight ? 'bg-yellow-100/50 -mx-2 px-2 py-1 rounded-lg' : ''}`}>
                           <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                           <span className={`text-sm text-black ${isHighlight ? 'font-black' : 'font-medium'}`}>
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
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-black text-white rounded-2xl p-6 text-center">
              <h4 className="text-xl font-display font-black mb-2">
                {state === 'success' ? 'Welcome to the Club!' : 'Ready to upgrade?'}
              </h4>
              <p className="text-sm text-gray-300 mb-4">
                {state === 'success' 
                  ? 'Your Pro features are now unlocked. Start tracking like a pro!' 
                  : 'Join 10,000+ students who never miss a class with AI-powered attendance tracking'}
              </p>
              
              <div className="flex gap-3 justify-center">
                {state !== 'success' && (
                  <>
                    <Button
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => onOpenChange(false)}
                      className="bg-white text-black border-2 border-white hover:bg-gray-100 font-bold rounded-full h-12 px-8"
                    >
                      Maybe Later
                    </Button>
                    <Button
                      onClick={handleUpgrade}
                      disabled={isLoading}
                      className="bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all h-12 px-8 flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {state === 'verifying' ? 'Verifying...' : 'Processing...'}
                        </>
                      ) : (
                        state === 'failed' ? "Try Again" : "Upgrade to Pro"
                      )}
                    </Button>
                  </>
                )}
                {state === 'success' && (
                  <Button
                    onClick={() => onOpenChange(false)}
                    className="bg-green-500 hover:bg-green-600 text-white font-black rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-12 px-8"
                  >
                    Go back to Dashboard
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
