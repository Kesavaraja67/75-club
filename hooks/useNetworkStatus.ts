"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

/**
 * Tracks the device network status and connection quality.
 * Alerts the user gracefully when offline or on a slow network.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== "undefined") return navigator.onLine;
    return true;
  });
  const [isSlow, setIsSlow] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("You're back online.", { id: "network-status" });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("You're offline — showing cached data", {
        id: "network-status",
        duration: Number.POSITIVE_INFINITY,
      });
    };

    const checkConnection = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connection = (navigator as any).connection;
      if (connection) {
        if (
          connection.effectiveType === "2g" ||
          connection.effectiveType === "slow-2g" ||
          connection.saveData
        ) {
          setIsSlow(true);
          toast.warning("Slow connection detected. Loading may take longer.", {
            id: "network-speed",
            duration: 5000,
          });
        } else {
          setIsSlow(false);
          toast.dismiss("network-speed");
        }
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener("change", checkConnection);
      checkConnection(); // Initial check
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", checkConnection);
      }
    };
  }, []);

  return { isOnline, isSlow };
}
