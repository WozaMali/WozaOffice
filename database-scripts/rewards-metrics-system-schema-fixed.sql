-- ============================================================================
-- REWARDS AND METRICS SYSTEM SCHEMA FOR WOZAMALI (FIXED VERSION)
-- ============================================================================
-- This schema handles cross-repository communication for wallets, points, rewards, 
-- donations, withdrawals, and metrics
-- Designed to work with external services and other repositories
-- ============================================================================

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- External service connections for cross-repository communication
CREATE TABLE IF NOT EXISTS external_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE,
  service_type TEXT NOT NULL CHECK (service_type IN ('wallet', 'rewards', 'analytics', 'payment', 'notification')),
  base_url TEXT NOT NULL,
  api_key_hash TEXT,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API keys for external service authentication
CREATE TABLE IF NOT EXISTS service_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES external_services(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cross-repository sync queue for pending updates
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_service_id UUID NOT NULL REFERENCES external_services(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('wallet_update', 'points_update', 'reward_issue', 'donation_create', 'withdrawal_request', 'metrics_update')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('wallet', 'user', 'transaction', 'reward', 'donation', 'withdrawal', 'metric')),
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 10),
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retry')),
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- WALLET SYSTEM EXTENSIONS
-- ============================================================================

-- Enhanced wallet table with external sync capabilities
CREATE TABLE IF NOT EXISTS enhanced_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  total_points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  external_wallet_id TEXT, -- ID from external wallet service
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallet sync history for audit trail
CREATE TABLE IF NOT EXISTS wallet_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES enhanced_wallets(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('push', 'pull', 'full_sync')),
  external_service_id UUID NOT NULL REFERENCES external_services(id) ON DELETE CASCADE,
  old_balance DECIMAL(10,2),
  new_balance DECIMAL(10,2),
  old_points INTEGER,
  new_points INTEGER,
  sync_result TEXT NOT NULL CHECK (sync_result IN ('success', 'partial', 'failed')),
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- REWARDS SYSTEM
-- ============================================================================

-- Reward definitions that can be configured externally
CREATE TABLE IF NOT EXISTS reward_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER DEFAULT 0,
  monetary_value DECIMAL(10,2) DEFAULT 0.00,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('discount', 'cashback', 'product', 'service', 'badge')),
  is_active BOOLEAN DEFAULT true,
  external_reward_id TEXT, -- ID from external rewards service
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User rewards and redemptions
CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_definition_id UUID NOT NULL REFERENCES reward_definitions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  points_spent INTEGER DEFAULT 0,
  monetary_value DECIMAL(10,2) DEFAULT 0.00,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  external_reward_id TEXT, -- ID from external rewards service
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- DONATIONS SYSTEM
-- ============================================================================

-- Donation campaigns
CREATE TABLE IF NOT EXISTS donation_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(10,2),
  current_amount DECIMAL(10,2) DEFAULT 0.00,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  external_campaign_id TEXT, -- ID from external donation service
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User donations
CREATE TABLE IF NOT EXISTS user_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES donation_campaigns(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  points_earned INTEGER DEFAULT 0,
  donation_type TEXT DEFAULT 'monetary' CHECK (donation_type IN ('monetary', 'points', 'mixed')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  external_donation_id TEXT, -- ID from external donation service
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- WITHDRAWALS SYSTEM
-- ============================================================================

-- Withdrawal requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  withdrawal_method TEXT NOT NULL CHECK (withdrawal_method IN ('bank_transfer', 'mobile_money', 'paypal', 'crypto')),
  account_details JSONB, -- Encrypted account information
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
  admin_notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  external_withdrawal_id TEXT, -- ID from external payment service
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- METRICS AND ANALYTICS
-- ============================================================================

-- User activity metrics
CREATE TABLE IF NOT EXISTS user_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_recycling_kg DECIMAL(8,2) DEFAULT 0.00,
  total_points_earned INTEGER DEFAULT 0,
  total_points_spent INTEGER DEFAULT 0,
  total_donations DECIMAL(10,2) DEFAULT 0.00,
  total_withdrawals DECIMAL(10,2) DEFAULT 0.00,
  login_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE,
  external_metrics_id TEXT, -- ID from external analytics service
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, metric_date)
);

-- System-wide metrics for external reporting
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('daily', 'weekly', 'monthly')),
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_recycling_kg DECIMAL(12,2) DEFAULT 0.00,
  total_points_issued INTEGER DEFAULT 0,
  total_points_redeemed INTEGER DEFAULT 0,
  total_donations DECIMAL(12,2) DEFAULT 0.00,
  total_withdrawals DECIMAL(12,2) DEFAULT 0.00,
  external_metrics_id TEXT, -- ID from external analytics service
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(metric_date, metric_type)
);

-- ============================================================================
-- WEBHOOKS AND NOTIFICATIONS
-- ============================================================================

-- Webhook endpoints for external services
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES external_services(id) ON DELETE CASCADE,
  endpoint_url TEXT NOT NULL,
  events TEXT[] NOT NULL, -- Array of event types to listen for
  is_active BOOLEAN DEFAULT true,
  secret_key_hash TEXT, -- For webhook signature verification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook delivery history
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivery_time_ms INTEGER,
  success BOOLEAN DEFAULT false,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to add items to sync queue
CREATE OR REPLACE FUNCTION public.add_to_sync_queue(
  p_target_service_id UUID,
  p_operation_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_payload JSONB,
  p_priority INTEGER DEFAULT 1
) RETURNS UUID AS $$
DECLARE
  v_sync_id UUID;
BEGIN
  INSERT INTO sync_queue (
    target_service_id,
    operation_type,
    entity_type,
    entity_id,
    payload,
    priority
  ) VALUES (
    p_target_service_id,
    p_operation_type,
    p_entity_type,
    p_entity_id,
    p_payload,
    p_priority
  ) RETURNING id INTO v_sync_id;
  
  RETURN v_sync_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update wallet and queue sync
CREATE OR REPLACE FUNCTION public.update_wallet_with_sync(
  p_user_id UUID,
  p_balance_change DECIMAL(10,2),
  p_points_change INTEGER,
  p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_wallet_id UUID;
  v_sync_services UUID[];
  v_service_id UUID;
BEGIN
  -- Get wallet ID
  SELECT id INTO v_wallet_id 
  FROM enhanced_wallets 
  WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update wallet
  UPDATE enhanced_wallets 
  SET 
    balance = balance + p_balance_change,
    total_points = total_points + p_points_change,
    updated_at = NOW(),
    sync_status = 'pending'
  WHERE id = v_wallet_id;
  
  -- Get active external wallet services
  SELECT array_agg(id) INTO v_sync_services
  FROM external_services 
  WHERE service_type = 'wallet' AND is_active = true;
  
  -- Queue sync for each service
  FOREACH v_service_id IN ARRAY v_sync_services LOOP
    PERFORM public.add_to_sync_queue(
      v_service_id,
      'wallet_update',
      'wallet',
      v_wallet_id,
      jsonb_build_object(
        'user_id', p_user_id,
        'balance_change', p_balance_change,
        'points_change', p_points_change,
        'description', p_description
      ),
      1
    );
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process sync queue
CREATE OR REPLACE FUNCTION public.process_sync_queue() RETURNS INTEGER AS $$
DECLARE
  v_processed_count INTEGER := 0;
  v_sync_item RECORD;
BEGIN
  -- Process pending items in priority order
  FOR v_sync_item IN 
    SELECT * FROM sync_queue 
    WHERE status = 'pending' 
    ORDER BY priority DESC, created_at ASC 
    LIMIT 10
  LOOP
    -- Update status to processing
    UPDATE sync_queue 
    SET status = 'processing', updated_at = NOW() 
    WHERE id = v_sync_item.id;
    
    -- Here you would implement the actual sync logic
    -- For now, we'll mark as completed
    UPDATE sync_queue 
    SET 
      status = 'completed', 
      processed_at = NOW(), 
      updated_at = NOW() 
    WHERE id = v_sync_item.id;
    
    v_processed_count := v_processed_count + 1;
  END LOOP;
  
  RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE external_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for enhanced_wallets (with DROP IF EXISTS)
DROP POLICY IF EXISTS "Users can view own enhanced wallet" ON enhanced_wallets;
CREATE POLICY "Users can view own enhanced wallet" ON enhanced_wallets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own enhanced wallet" ON enhanced_wallets;
CREATE POLICY "Users can update own enhanced wallet" ON enhanced_wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_rewards (with DROP IF EXISTS)
DROP POLICY IF EXISTS "Users can view own rewards" ON user_rewards;
CREATE POLICY "Users can view own rewards" ON user_rewards
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rewards" ON user_rewards;
CREATE POLICY "Users can insert own rewards" ON user_rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_donations (with DROP IF EXISTS)
DROP POLICY IF EXISTS "Users can view own donations" ON user_donations;
CREATE POLICY "Users can view own donations" ON user_donations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own donations" ON user_donations;
CREATE POLICY "Users can insert own donations" ON user_donations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for withdrawal_requests (with DROP IF EXISTS)
DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Users can view own withdrawal requests" ON withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Users can insert own withdrawal requests" ON withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_metrics (with DROP IF EXISTS)
DROP POLICY IF EXISTS "Users can view own metrics" ON user_metrics;
CREATE POLICY "Users can view own metrics" ON user_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Admin policies for system-wide tables (with DROP IF EXISTS)
DROP POLICY IF EXISTS "Admins can manage external services" ON external_services;
CREATE POLICY "Admins can manage external services" ON external_services
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admins can manage sync queue" ON sync_queue;
CREATE POLICY "Admins can manage sync queue" ON sync_queue
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admins can manage system metrics" ON system_metrics;
CREATE POLICY "Admins can manage system metrics" ON system_metrics
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- External services indexes
CREATE INDEX IF NOT EXISTS idx_external_services_type ON external_services(service_type);
CREATE INDEX IF NOT EXISTS idx_external_services_active ON external_services(is_active);

-- Sync queue indexes
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_service ON sync_queue(target_service_id, status);

-- Enhanced wallet indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_wallets_user_id ON enhanced_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_wallets_sync_status ON enhanced_wallets(sync_status);

-- User rewards indexes
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_status ON user_rewards(status);

-- Donation indexes
CREATE INDEX IF NOT EXISTS idx_user_donations_user_id ON user_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_donations_campaign_id ON user_donations(campaign_id);

-- Withdrawal indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

-- Metrics indexes
CREATE INDEX IF NOT EXISTS idx_user_metrics_user_date ON user_metrics(user_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_system_metrics_date_type ON system_metrics(metric_date, metric_type);

-- Webhook indexes
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_success ON webhook_deliveries(success, created_at);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default external service types
INSERT INTO external_services (service_name, service_type, base_url, is_active) VALUES
  ('default-wallet-service', 'wallet', 'https://api.wallet-service.com', true),
  ('default-rewards-service', 'rewards', 'https://api.rewards-service.com', true),
  ('default-analytics-service', 'analytics', 'https://api.analytics-service.com', true),
  ('default-payment-service', 'payment', 'https://api.payment-service.com', true)
ON CONFLICT (service_name) DO NOTHING;

-- Insert default reward definitions
INSERT INTO reward_definitions (reward_code, name, description, points_cost, reward_type) VALUES
  ('BRONZE_BADGE', 'Bronze Recycler', 'Earned for first 100 points', 0, 'badge'),
  ('SILVER_BADGE', 'Silver Recycler', 'Earned for first 500 points', 0, 'badge'),
  ('GOLD_BADGE', 'Gold Recycler', 'Earned for first 1000 points', 0, 'badge'),
  ('PLATINUM_BADGE', 'Platinum Recycler', 'Earned for first 5000 points', 0, 'badge'),
  ('CASHBACK_5', '5% Cashback', '5% cashback on next purchase', 100, 'cashback'),
  ('DISCOUNT_10', '10% Discount', '10% discount on services', 200, 'discount')
ON CONFLICT (reward_code) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE external_services IS 'External services for cross-repository communication';
COMMENT ON TABLE sync_queue IS 'Queue for pending updates to external services';
COMMENT ON TABLE enhanced_wallets IS 'Enhanced wallets with external sync capabilities';
COMMENT ON TABLE user_metrics IS 'Daily user activity metrics for analytics';
COMMENT ON TABLE system_metrics IS 'System-wide metrics for external reporting';
COMMENT ON TABLE webhook_endpoints IS 'Webhook endpoints for external service notifications';

COMMENT ON FUNCTION public.add_to_sync_queue IS 'Adds an item to the sync queue for external service updates';
COMMENT ON FUNCTION public.update_wallet_with_sync IS 'Updates wallet and queues sync with external services';
COMMENT ON FUNCTION public.process_sync_queue IS 'Processes pending sync queue items';

-- ============================================================================
-- SCHEMA COMPLETE (FIXED VERSION)
-- ============================================================================
