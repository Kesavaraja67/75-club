/**
 * @file lib/razorpay-loader.ts
 * @description Idempotent script loader for the Razorpay Checkout SDK.
 * Ensures the SDK is loaded exactly once and provides a reliable promise for callers.
 */

let razorpayLoaded = false;
let loadingPromise: Promise<void> | null = null;

/**
 * Loads the Razorpay SDK script dynamically.
 * @returns {Promise<void>} Resolves when the script is ready, or rejects on timeout/error.
 */
export function loadRazorpayScript(): Promise<void> {
  // 1. Return immediately if already globally available
  if (typeof window !== 'undefined' && 'Razorpay' in window) {
    razorpayLoaded = true;
    return Promise.resolve();
  }

  // 2. Return existing promise if a load is already in progress
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.id = 'razorpay-sdk';

    script.onload = () => {
      razorpayLoaded = true;
      resolve();
    };

    script.onerror = () => {
      loadingPromise = null;
      reject(new Error('Failed to load Razorpay SDK. Please check your connection.'));
    };

    // 3. Fail fast if it takes too long (10s)
    const timeout = setTimeout(() => {
      if (!razorpayLoaded) {
        loadingPromise = null;
        reject(new Error('Razorpay SDK load timeout. Please try again.'));
      }
    }, 10000);

    // Cleanup timeout if it loads
    script.addEventListener('load', () => clearTimeout(timeout));

    document.head.appendChild(script);
  });

  return loadingPromise;
}
