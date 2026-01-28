-- ============================================================================
-- WOZA MALI OFFICE DATABASE SCHEMA
-- ============================================================================
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- CORE USER MANAGEMENT TABLES
-- ============================================================================

-- Create profiles table for office users (admins, staff, collectors)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'STAFF', 'COLLECTOR')),
  is_active BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_permissions table for granular access control
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  permission_name TEXT NOT NULL,
  granted BOOLEAN DEFAULT TRUE,
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, permission_name)
);

-- ============================================================================
-- RECYCLING MANAGEMENT TABLES
-- ============================================================================

-- Create materials table for different types of recyclable materials
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create addresses table for customer pickup locations
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  street_address TEXT NOT NULL,
  suburb TEXT,
  ext_zone_phase TEXT,
  city TEXT NOT NULL,
  postal_code TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pickups table for scheduled collection requests
CREATE TABLE IF NOT EXISTS public.pickups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  collector_id UUID REFERENCES public.profiles(id),
  address_id UUID REFERENCES public.addresses(id) NOT NULL,
  pickup_date DATE NOT NULL,
  pickup_time_slot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  total_weight DECIMAL(8,2),
  total_value DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pickup_items table for individual materials in each pickup
CREATE TABLE IF NOT EXISTS public.pickup_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pickup_id UUID REFERENCES public.pickups(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES public.materials(id) NOT NULL,
  weight DECIMAL(8,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pickup_photos table for verification and documentation
CREATE TABLE IF NOT EXISTS public.pickup_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pickup_id UUID REFERENCES public.pickups(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type TEXT CHECK (photo_type IN ('before', 'after', 'verification')),
  uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL MANAGEMENT TABLES
-- ============================================================================

-- Create wallets table for customer balances
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) UNIQUE NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0.00,
  total_points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'Bronze Recycler' CHECK (tier IN ('Bronze Recycler', 'Silver Recycler', 'Gold Recycler', 'Platinum Recycler', 'Diamond Recycler')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table for wallet transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_id UUID REFERENCES public.wallets(id) NOT NULL,
  pickup_id UUID REFERENCES public.pickups(id),
  amount DECIMAL(10,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'withdrawal', 'refund')),
  description TEXT NOT NULL,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawals table for customer cash-out requests
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  withdrawal_method TEXT NOT NULL CHECK (withdrawal_method IN ('bank_transfer', 'mobile_money', 'cash_pickup')),
  account_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'completed', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- OPERATIONAL TABLES
-- ============================================================================

-- Create collector_assignments table for work distribution
CREATE TABLE IF NOT EXISTS public.collector_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  collector_id UUID REFERENCES public.profiles(id) NOT NULL,
  pickup_id UUID REFERENCES public.pickups(id) NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'in_progress', 'completed')),
  notes TEXT,
  UNIQUE(pickup_id)
);

-- Create collector_schedules table for work planning
CREATE TABLE IF NOT EXISTS public.collector_schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  collector_id UUID REFERENCES public.profiles(id) NOT NULL,
  work_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  area_assigned TEXT,
  max_pickups INTEGER DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table for system alerts
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUDIT AND LOGGING TABLES
-- ============================================================================

-- Create user_activity_log table for audit trail
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_logs table for administrative actions
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES public.profiles(id) NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CONFIGURATION TABLES
-- ============================================================================

-- Create app_settings table for system configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_templates table for customizable notifications
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_name TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collector_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collector_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Materials policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view materials" ON public.materials
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage materials" ON public.materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Pickups policies
CREATE POLICY "Users can view own pickups" ON public.pickups
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Collectors can view assigned pickups" ON public.pickups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.collector_assignments WHERE pickup_id = pickups.id AND collector_id = auth.uid())
  );

CREATE POLICY "Admins and staff can view all pickups" ON public.pickups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF'))
  );

-- Wallets policies
CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all wallets" ON public.wallets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Withdrawals policies
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins and staff can view all withdrawals" ON public.withdrawals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF'))
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with basic information
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name,
    last_name,
    email_verified
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
  );
  
  -- Log user registration activity
  INSERT INTO public.user_activity_log (
    user_id,
    activity_type,
    description,
    metadata
  )
  VALUES (
    NEW.id,
    'user_registration',
    'User registered successfully',
    jsonb_build_object(
      'email', NEW.email, 
      'provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user login
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last login and login count
  UPDATE public.profiles 
  SET 
    last_login = NOW(),
    login_count = login_count + 1,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  -- Log login activity
  INSERT INTO public.user_activity_log (
    user_id,
    activity_type,
    description,
    metadata
  )
  VALUES (
    NEW.id,
    'user_login',
    'User logged in successfully',
    jsonb_build_object('login_time', NOW())
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate pickup total
CREATE OR REPLACE FUNCTION public.calculate_pickup_total(pickup_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(total_price), 0.00)
  INTO total
  FROM public.pickup_items
  WHERE pickup_id = pickup_uuid;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION public.update_wallet_balance(wallet_uuid UUID, amount_change DECIMAL(10,2))
RETURNS VOID AS $$
BEGIN
  UPDATE public.wallets
  SET 
    balance = balance + amount_change,
    updated_at = NOW()
  WHERE id = wallet_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to handle user login
CREATE OR REPLACE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_user_login();

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pickups_updated_at
  BEFORE UPDATE ON public.pickups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collector_schedules_updated_at
  BEFORE UPDATE ON public.collector_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_pickups_customer_id ON public.pickups(customer_id);
CREATE INDEX IF NOT EXISTS idx_pickups_collector_id ON public.pickups(collector_id);
CREATE INDEX IF NOT EXISTS idx_pickups_status ON public.pickups(status);
CREATE INDEX IF NOT EXISTS idx_pickups_date ON public.pickups(pickup_date);
CREATE INDEX IF NOT EXISTS idx_pickup_items_pickup_id ON public.pickup_items(pickup_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_wallet_id ON public.payments(wallet_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_collector_assignments_collector_id ON public.collector_assignments(collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_assignments_pickup_id ON public.collector_assignments(pickup_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created ON public.user_activity_log(created_at);

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert default materials
INSERT INTO public.materials (name, category, unit, price_per_unit, description) VALUES
  ('Plastic Bottles', 'Plastic', 'kg', 2.50, 'Clean plastic bottles and containers'),
  ('Paper & Cardboard', 'Paper', 'kg', 1.80, 'Clean paper, cardboard, and cartons'),
  ('Glass Bottles', 'Glass', 'kg', 1.20, 'Clean glass bottles and jars'),
  ('Aluminum Cans', 'Metal', 'kg', 8.00, 'Clean aluminum beverage cans'),
  ('Steel Cans', 'Metal', 'kg', 3.50, 'Clean steel food cans'),
  ('Electronics', 'E-Waste', 'kg', 15.00, 'Small electronic devices and components')
ON CONFLICT (name) DO NOTHING;

-- Insert default app settings
INSERT INTO public.app_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
  ('company_name', 'Woza Mali', 'string', 'Company name for the application', true),
  ('max_pickup_weight', '100', 'number', 'Maximum weight per pickup in kg', false),
  ('pickup_time_slots', '["09:00-11:00", "11:00-13:00", "13:00-15:00", "15:00-17:00"]', 'json', 'Available pickup time slots', true),
  ('min_withdrawal_amount', '50.00', 'number', 'Minimum withdrawal amount in local currency', true),
  ('system_maintenance_mode', 'false', 'boolean', 'System maintenance mode flag', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default email templates
INSERT INTO public.email_templates (template_name, subject, html_content, text_content, variables) VALUES
  ('pickup_confirmation', 'Pickup Confirmed - Woza Mali', 
   '<h2>Pickup Confirmed!</h2><p>Your pickup has been confirmed for {{pickup_date}} at {{pickup_time}}.</p><p>Address: {{address}}</p>',
   'Pickup Confirmed!\n\nYour pickup has been confirmed for {{pickup_date}} at {{pickup_time}}.\n\nAddress: {{address}}',
   '{"pickup_date": "string", "pickup_time": "string", "address": "string"}'),
  ('withdrawal_approved', 'Withdrawal Approved - Woza Mali', 
   '<h2>Withdrawal Approved!</h2><p>Your withdrawal of {{amount}} has been approved and will be processed within 24-48 hours.</p>',
   'Withdrawal Approved!\n\nYour withdrawal of {{amount}} has been approved and will be processed within 24-48 hours.',
   '{"amount": "string"}')
ON CONFLICT (template_name) DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Schema setup complete!
-- Next steps:
-- 1. Create your first admin user through Supabase Auth
-- 2. Update the user's role to 'ADMIN' in the profiles table
-- 3. Test the system with sample data
-- 4. Configure additional settings as needed
