"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Prevents the Android physical back button from immediately exiting the PWA.
 * It pushes a dummy state on mount. If the user presses back, they pop the dummy state,
 * we catch it, push it back, and show a toast instructing them to use the Home button.
 */
export function useAndroidBackButtonLock() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only apply in PWA standalone mode
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).standalone === true;

    if (!isPWA) return;

    const launchUrl = window.location.pathname + window.location.search + window.location.hash;

    // Push a dummy state so the first "back" press doesn't exit the app
    // Only push if we haven't already
    if (!window.history.state?.pwaLocked) {
      window.history.pushState({ pwaLocked: true }, "");
    }

    const handlePopState = (e: PopStateEvent) => {
      const currentUrl = window.location.pathname + window.location.search + window.location.hash;

      // If the user pressed back, they popped the dummy state.
      // We block it by pushing the state right back and warning them.
      if (currentUrl === launchUrl && (!e.state || !e.state.pwaLocked)) {
        window.history.pushState(
          { ...(window.history.state ?? {}), pwaLocked: true },
          ""
        );
        toast("App navigation locked", {
          description: "Use the Android Home button to exit the app, or app menus to navigate.",
          id: "back-button-warning",
        });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
}
