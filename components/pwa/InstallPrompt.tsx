"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handler = (e: Event) => {
      // Prevent default browser install prompt
      e.preventDefault();
      // Store event for later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show our custom UI
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success("Thanks for installing 75 Club!");
    }
    
    // We can't use the prompt again, verify outcome
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-50 md:max-w-sm animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-black text-white p-4 rounded-xl shadow-2xl border-2 border-white/20 flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-display font-bold text-lg leading-tight">Install App</h3>
          <p className="text-sm text-gray-300">Add 75 Club to your home screen</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setShowPrompt(false)} 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button 
            onClick={handleInstallClick} 
            size="sm" 
            className="bg-white text-black hover:bg-gray-200 font-bold"
          >
            <Download className="mr-2 h-4 w-4" /> Install
          </Button>
        </div>
      </div>
    </div>
  );
}
