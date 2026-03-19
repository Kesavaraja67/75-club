-- Add idempotency columns for audit
ALTER TABLE IF EXISTS payment_orders 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS razorpay_refund_id TEXT; -- Tracking refunds explicitly

-- Create indexes for faster lookup by Razorpay identifiers
CREATE INDEX IF NOT EXISTS idx_payment_orders_razorpay_order_id ON payment_orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_razorpay_payment_id ON payment_orders(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_razorpay_refund_id ON payment_orders(razorpay_refund_id);

-- Add unique constraint to subscriptions to prevent double-crediting
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_razorpay_payment_id ON subscriptions(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

-- Update subscriptions with activation source
ALTER TABLE IF EXISTS subscriptions 
ADD COLUMN IF NOT EXISTS activated_via TEXT DEFAULT 'verify';

-- Idempotent constraint addition for activated_via
DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'subscriptions_activated_via_check'
         AND conrelid = 'public.subscriptions'::regclass
     ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_activated_via_check
      CHECK (activated_via IN ('verify', 'webhook', 'manual'));
  END IF;
END $$;
