import Razorpay from "razorpay";

/**
 * @file lib/razorpay.ts
 * @description Razorpay configuration and utility functions for payment processing.
 * Deferring initialization to runtime to avoid build-time environment checks.
 */

let razorpayInstance: Razorpay | null = null;

/**
 * Lazy initializer for the Razorpay server-side instance.
 */
export function getRazorpay(): Razorpay {
  if (razorpayInstance) return razorpayInstance;

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!keyId || !keySecret || !webhookSecret) {
    throw new Error(
      "Missing Razorpay configuration (NEXT_PUBLIC_RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, or RAZORPAY_WEBHOOK_SECRET). " +
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
 * Payment configuration constants.
 */
export const PAYMENT_CONFIG = {
  PRO_SEMESTER_PRICE: 249,
  CURRENCY: "INR",
  RECEIPT_PREFIX: "order_",
} as const;

/**
 * Generates a unique receipt ID for orders.
 */
export function generateReceiptId(): string {
  return `${PAYMENT_CONFIG.RECEIPT_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Converts an amount in Rupees to Paise.
 */
export function rupeesToPaise(amount: number): number {
  return Math.round(amount * 100);
}
