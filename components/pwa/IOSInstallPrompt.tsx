"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Share, PlusSquare } from "lucide-react";
import { isInstalledPWA } from "@/lib/pwa-utils";

export default function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if user is on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream;
    
    // Check if running in browser (not standalone)
    const isStandalone = isInstalledPWA();
    
    if (isIOS && !isStandalone) {
      // Check if user has dismissed it before
      const hasDismissed = localStorage.getItem('ios-install-dismissed');
      
      // Show prompt after a short delay if not dismissed recently
      // Using session storage or similar would differ, here we assume persistent dismissal is preferred by user
      if (!hasDismissed) {
        const timer = setTimeout(() => {
            setShowPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ios-install-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-white/90 backdrop-blur-md border-t-2 border-black/10 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] rounded-t-2xl p-6 max-w-md mx-auto relative">
        <Button 
          onClick={handleDismiss} 
          variant="ghost" 
          size="sm" 
          className="absolute top-2 right-2 h-8 w-8 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📱</span>
            <div>
              <h3 className="font-display font-bold text-lg">Install 75 Club</h3>
              <p className="text-sm text-gray-500">Get the best full-screen experience</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 text-sm font-medium text-gray-700 bg-gray-50 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg text-blue-600">
                <Share className="w-4 h-4" />
              </div>
              <span>Tap the <span className="font-bold">Share</span> button below</span>
            </div>
            <div className="w-full h-px bg-gray-200" />
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg text-gray-600">
                <PlusSquare className="w-4 h-4" />
              </div>
              <span>Select <span className="font-bold">Add to Home Screen</span></span>
            </div>
          </div>
        </div>
        
        {/* Pointing arrow for Share button at bottom */}
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-t-[14px] border-t-white/90 border-r-[10px] border-r-transparent animate-bounce" />
      </div>
    </div>
  );
}
