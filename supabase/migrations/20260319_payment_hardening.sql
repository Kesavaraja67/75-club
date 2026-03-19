-- Migration: Payment Hardening & Idempotency
-- Run this in your Supabase SQL Editor

-- 1. Add idempotency and audit columns to payment_orders
ALTER TABLE IF EXISTS payment_orders 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP WITH TIME ZONE;

-- 2. Add activation tracking to subscriptions
ALTER TABLE IF EXISTS subscriptions 
ADD COLUMN IF NOT EXISTS activated_via TEXT DEFAULT 'verify' 
CHECK (activated_via IN ('verify', 'webhook', 'manual'));

-- 3. Create index for faster lookups by Razorpay ID (critical for webhooks)
CREATE INDEX IF NOT EXISTS idx_payment_orders_razorpay_order_id ON payment_orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_razorpay_payment_id ON payment_orders(razorpay_payment_id);
