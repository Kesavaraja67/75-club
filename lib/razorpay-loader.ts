let loadingPromise: Promise<void> | null = null;
let razorpayLoaded = false;

/**
 * Dynamically loads the Razorpay checkout script.
 * Returns a promise that resolves when the script is loaded and window.Razorpay is available.
 */
export function loadRazorpayScript(): Promise<void> {
  // SSR Guard
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Razorpay script can only be loaded in a browser environment'));
  }

  // 1. Return immediately if already globally available
  if ('Razorpay' in window) {
    razorpayLoaded = true;
    return Promise.resolve();
  }

  // 2. Return existing promise if a load is already in progress
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    
    // Prevent script from hanging
    const timeout = setTimeout(() => {
      reject(new Error('Razorpay SDK load timeout'));
    }, 10000);

    script.onload = () => {
      clearTimeout(timeout);
      razorpayLoaded = true;
      resolve();
    };

    script.onerror = () => {
      clearTimeout(timeout);
      loadingPromise = null; // Allow retry
      reject(new Error('Failed to load Razorpay SDK'));
    };

    document.body.appendChild(script);
  });

  return loadingPromise;
}

export function isRazorpayLoaded(): boolean {
  return razorpayLoaded;
}
