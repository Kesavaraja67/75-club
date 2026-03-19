import Razorpay from "razorpay";

/**
 * @file lib/razorpay.ts
 * @description Razorpay configuration and utility functions for payment processing.
 * Initializes the Razorpay instance with environment variables and provides helpers.
 */

/**
 * Razorpay instance initialized with server-side keys.
 * Used for creating orders and verifying signatures.
 * @type {Razorpay}
 */
const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!keyId || !keySecret || !webhookSecret) {
  throw new Error("Missing Razorpay configuration: NEXT_PUBLIC_RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET must be set");
}

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

/**
 * Payment configuration constants.
 * @property {number} PRO_SEMESTER_PRICE - Cost of the Pro plan in INR.
 * @property {string} CURRENCY - Currency code (INR).
 * @property {string} RECEIPT_PREFIX - Prefix for internal order receipt IDs.
 */
export const PAYMENT_CONFIG = {
  PRO_SEMESTER_PRICE: 249,
  CURRENCY: "INR",
  RECEIPT_PREFIX: "order_",
} as const;

/**
 * Generates a unique receipt ID for orders.
 * combines prefix, timestamp, and random string.
 * @returns {string} A unique identifier string for the receipt.
 */
export function generateReceiptId(): string {
  return `${PAYMENT_CONFIG.RECEIPT_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Converts an amount in Rupees to Paise (lowest currency unit).
 * Razorpay APIs require amounts to be passed in paise.
 * @param {number} amount - The amount in INR.
 * @returns {number} The amount in paise.
 */
export function rupeesToPaise(amount: number): number {
  return Math.round(amount * 100);
}
