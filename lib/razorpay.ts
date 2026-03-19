import Razorpay from "razorpay";

/**
 * Lazy initialization for Razorpay client.
 * This prevents build-time environment variable checks from failing.
 */
let razorpayInstance: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (razorpayInstance) return razorpayInstance;

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // Narrow validation to fields needed for order creation/clients
  if (!keyId || !keySecret) {
    console.error("Missing Razorpay configuration (NEXT_PUBLIC_RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET)");
    throw new Error(
      "Missing Razorpay configuration keyId and keySecret. " +
      "These must be set for payment functionality to work."
    );
  }

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayInstance;
}

/**
 * Utility to validate price strictly to 249 for the semester plan.
 * Prevents client-side price manipulation.
 */
export function validatePrice(amountInPaise: number) {
  const EXPECTED_API_PRICE = 24900; // ₹249.00
  return amountInPaise === EXPECTED_API_PRICE;
}

/**
 * Helper to generate order prefill notes
 */
export function generateOrderNotes(userId: string, planType: string = 'semester') {
  return {
    userId: userId,
    planType: planType,
    app: "75-club",
    version: "1.0.0"
  };
}
