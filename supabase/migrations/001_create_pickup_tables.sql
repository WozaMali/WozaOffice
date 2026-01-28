-- Create pickup tables for Collector → Admin → Customer flow

-- Pickups table (main table)
CREATE TABLE pickups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collector_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  collector_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  address TEXT NOT NULL,
  pickup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  total_kg DECIMAL(10,2) NOT NULL,
  total_value DECIMAL(10,2) DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  notes TEXT,
  admin_notes TEXT,
  customer_feedback TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_method TEXT CHECK (payment_method IN ('wallet', 'bank_transfer', 'cash')),
  environmental_impact JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials table (for individual materials in each pickup)
CREATE TABLE pickup_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pickup_id UUID REFERENCES pickups(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL,
  kg DECIMAL(10,2) NOT NULL,
  price_per_kg DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) DEFAULT 0,
  points_per_kg INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  photos TEXT[], -- Array of photo URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer profiles table
CREATE TABLE customer_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE NOT NULL,
  address TEXT,
  total_recycled_kg DECIMAL(10,2) DEFAULT 0,
  total_earned_points INTEGER DEFAULT 0,
  total_earned_money DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collector profiles table
CREATE TABLE collector_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  collector_id TEXT UNIQUE NOT NULL, -- e.g., "COL-001"
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE NOT NULL,
  assigned_routes TEXT[], -- Array of route IDs
  total_collections INTEGER DEFAULT 0,
  total_kg_collected DECIMAL(10,2) DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  rank_position INTEGER,
  streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Routes table (for assigned pickup locations)
CREATE TABLE routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_name TEXT NOT NULL,
  description TEXT,
  assigned_collector_id UUID REFERENCES collector_profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pickup locations table (specific addresses in routes)
CREATE TABLE pickup_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  preferred_materials TEXT[], -- Array of material types
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_pickups_collector_id ON pickups(collector_id);
CREATE INDEX idx_pickups_customer_email ON pickups(customer_email);
CREATE INDEX idx_pickups_status ON pickups(status);
CREATE INDEX idx_pickups_pickup_date ON pickups(pickup_date);
CREATE INDEX idx_pickup_materials_pickup_id ON pickup_materials(pickup_id);
CREATE INDEX idx_customer_profiles_user_id ON customer_profiles(user_id);
CREATE INDEX idx_collector_profiles_user_id ON collector_profiles(user_id);
CREATE INDEX idx_pickup_locations_route_id ON pickup_locations(route_id);

-- Enable Row Level Security (RLS)
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Pickups policies
CREATE POLICY "Collectors can view their own pickups" ON pickups
  FOR SELECT USING (auth.uid() = collector_id);

CREATE POLICY "Collectors can insert their own pickups" ON pickups
  FOR INSERT WITH CHECK (auth.uid() = collector_id);

CREATE POLICY "Collectors can update their own pickups" ON pickups
  FOR UPDATE USING (auth.uid() = collector_id);

CREATE POLICY "Admins can view all pickups" ON pickups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM collector_profiles 
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR role = 'staff')
    )
  );

CREATE POLICY "Customers can view their own pickups" ON pickups
  FOR SELECT USING (
    customer_email = (
      SELECT email FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- Pickup materials policies
CREATE POLICY "Collectors can view materials for their pickups" ON pickup_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE id = pickup_materials.pickup_id 
      AND collector_id = auth.uid()
    )
  );

CREATE POLICY "Collectors can insert materials for their pickups" ON pickup_materials
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE id = pickup_materials.pickup_id 
      AND collector_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all materials" ON pickup_materials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM collector_profiles 
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR role = 'staff')
    )
  );

-- Customer profiles policies
CREATE POLICY "Users can view their own profile" ON customer_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON customer_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON customer_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Collector profiles policies
CREATE POLICY "Collectors can view their own profile" ON collector_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Collectors can update their own profile" ON collector_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all collector profiles" ON collector_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM collector_profiles 
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR role = 'staff')
    )
  );

-- Routes policies
CREATE POLICY "Collectors can view their assigned routes" ON routes
  FOR SELECT USING (
    assigned_collector_id = (
      SELECT id FROM collector_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all routes" ON routes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM collector_profiles 
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR role = 'staff')
    )
  );

-- Pickup locations policies
CREATE POLICY "Collectors can view locations in their routes" ON pickup_locations
  FOR SELECT USING (
    route_id IN (
      SELECT id FROM routes 
      WHERE assigned_collector_id = (
        SELECT id FROM collector_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage all pickup locations" ON pickup_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM collector_profiles 
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR role = 'staff')
    )
  );

-- Create functions for automatic calculations
CREATE OR REPLACE FUNCTION update_pickup_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update pickup totals when materials change
  UPDATE pickups 
  SET 
    total_kg = (
      SELECT COALESCE(SUM(kg), 0) 
      FROM pickup_materials 
      WHERE pickup_id = NEW.pickup_id
    ),
    total_value = (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM pickup_materials 
      WHERE pickup_id = NEW.pickup_id
    ),
    total_points = (
      SELECT COALESCE(SUM(total_points), 0) 
      FROM pickup_materials 
      WHERE pickup_id = NEW.pickup_id
    ),
    updated_at = NOW()
  WHERE id = NEW.pickup_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic total updates
CREATE TRIGGER trigger_update_pickup_totals
  AFTER INSERT OR UPDATE OR DELETE ON pickup_materials
  FOR EACH ROW EXECUTE FUNCTION update_pickup_totals();

-- Function to update collector stats
CREATE OR REPLACE FUNCTION update_collector_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update collector profile stats when pickup status changes
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE collector_profiles 
    SET 
      total_collections = total_collections + 1,
      total_kg_collected = total_kg_collected + NEW.total_kg,
      total_points_earned = total_points_earned + NEW.total_points,
      total_earnings = total_earnings + NEW.total_value,
      updated_at = NOW()
    WHERE user_id = NEW.collector_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for collector stats updates
CREATE TRIGGER trigger_update_collector_stats
  AFTER UPDATE ON pickups
  FOR EACH ROW EXECUTE FUNCTION update_collector_stats();

-- Function to update customer stats
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer profile stats when pickup is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE customer_profiles 
    SET 
      total_recycled_kg = total_recycled_kg + NEW.total_kg,
      total_earned_points = total_earned_points + NEW.total_points,
      total_earned_money = total_earned_money + NEW.total_value,
      updated_at = NOW()
    WHERE email = NEW.customer_email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for customer stats updates
CREATE TRIGGER trigger_update_customer_stats
  AFTER UPDATE ON pickups
  FOR EACH ROW EXECUTE FUNCTION update_customer_stats();
