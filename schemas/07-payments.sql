-- ============================================================================
-- 07. PAYMENT PROCESSING SCHEMA
-- ============================================================================
-- This file sets up the payment processing system with status tracking and methods

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
-- Payment processing for approved pickups with status tracking
CREATE TABLE payments (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid unique references pickups(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'ZAR',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  processed_at timestamptz,
  method text check (method in ('wallet','bank_transfer','cash','mobile_money')),
  reference_number text,
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_payments_pickup_id ON payments(pickup_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_processed_at ON payments(processed_at);
CREATE INDEX idx_payments_reference ON payments(reference_number);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================
-- Ensure positive amount
ALTER TABLE payments ADD CONSTRAINT chk_payments_positive_amount 
  CHECK (amount > 0);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can see payments for pickups they can access
CREATE POLICY "Users can view payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE pickups.id = payments.pickup_id
      AND (
        pickups.customer_id = auth.uid() OR 
        pickups.collector_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      )
    )
  );

-- Only admins can modify payments
CREATE POLICY "Only admins can modify payments" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Additional admin policies
CREATE POLICY "admin_payments" ON payments
  FOR ALL USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC PROCESSING
-- ============================================================================
-- Function to auto-create payment when pickup is approved
CREATE OR REPLACE FUNCTION create_payment_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- If pickup status changed to approved, create payment
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        INSERT INTO payments (pickup_id, amount, currency, status, method)
        VALUES (NEW.id, NEW.total_value, 'ZAR', 'pending', 'wallet');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create payment when pickup is approved
CREATE TRIGGER trigger_create_payment_on_approval
    AFTER UPDATE ON pickups
    FOR EACH ROW
    EXECUTE FUNCTION create_payment_on_approval();

-- Function to update processed_at when payment is approved
CREATE OR REPLACE FUNCTION update_payment_processed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- If payment status changed to approved, set processed_at
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        NEW.processed_at := now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update processed_at when payment is approved
CREATE TRIGGER trigger_update_payment_processed_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_processed_at();

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================================================
-- Uncomment these lines to insert test payments
/*
INSERT INTO payments (pickup_id, amount, currency, status, method, reference_number) VALUES
  ((SELECT id FROM pickups LIMIT 1), 38.75, 'ZAR', 'pending', 'wallet', 'PAY-001');
*/

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE payments IS 'Payment processing for approved pickups with status tracking';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, approved, or rejected';
COMMENT ON COLUMN payments.method IS 'Payment method: wallet, bank_transfer, cash, or mobile_money';
COMMENT ON COLUMN payments.reference_number IS 'External reference number for payment tracking';
COMMENT ON COLUMN payments.processed_at IS 'Timestamp when payment was processed';
COMMENT ON COLUMN payments.admin_notes IS 'Administrative notes about the payment';
