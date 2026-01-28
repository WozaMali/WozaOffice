# Supabase Setup Guide

## 🚀 **Installation Complete!**

Supabase has been successfully installed and configured to work with your new database schema. Here's what you need to do next:

## 📋 **Prerequisites**

1. **Create a Supabase Project** at [supabase.com](https://supabase.com)
2. **Get your project credentials** from the project settings

## 🔧 **Configuration Steps**

### **1. Create Environment File**
Create a `.env` file in your project root with:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### **2. Get Your Credentials**
- Go to your Supabase project dashboard
- Navigate to **Settings** → **API**
- Copy the **Project URL** and **anon public** key
- Replace the placeholder values in your `.env` file

### **3. Database Schema**
Your schema is already perfect! Here are the tables you've created:

#### **profiles** table ✅
```sql
create table profiles (
  id uuid primary key default auth.uid(),
  email text unique not null,
  full_name text,
  phone text unique,
  role text not null check (role in ('customer','collector','admin')),
  is_active boolean not null default true,
  created_at timestamptz default now()
);
```

#### **addresses** table ✅
```sql
create table addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  line1 text not null,
  suburb text not null,
  city text not null,
  postal_code text,
  lat double precision,
  lng double precision,
  is_primary boolean default false
);
```

#### **materials** table ✅
```sql
create table materials (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  unit text not null default 'kg',
  rate_per_kg numeric(10,2) not null default 0,
  is_active boolean not null default true
);
```

#### **pickups** table ✅
```sql
create table pickups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id),
  collector_id uuid references profiles(id),
  address_id uuid references addresses(id),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  lat double precision,
  lng double precision,
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  approval_note text
);
```

#### **pickup_items** table ✅
```sql
create table pickup_items (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid references pickups(id) on delete cascade,
  material_id uuid references materials(id),
  kilograms numeric(10,3) check (kilograms >= 0),
  contamination_pct numeric(5,2) check (contamination_pct between 0 and 100)
);
```

#### **pickup_photos** table ✅
```sql
create table pickup_photos (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid references pickups(id) on delete cascade,
  url text not null,
  taken_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  type text check (type in ('scale','bags','other'))
);
```

#### **payments** table ✅
```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid unique references pickups(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'ZAR',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  processed_at timestamptz,
  method text
);
```

### **4. Sample Data**
Insert some sample materials to get started:

```sql
-- Insert sample materials
INSERT INTO materials (name, unit, rate_per_kg, is_active) VALUES
('PET Bottles', 'kg', 2.50, true),
('HDPE', 'kg', 3.00, true),
('Glass', 'kg', 1.50, true),
('Aluminum Cans', 'kg', 8.00, true),
('Paper', 'kg', 1.00, true),
('Cardboard', 'kg', 0.80, true);
```

### **5. Row Level Security (RLS)**
Enable RLS and create policies for secure data access:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Addresses: Users can only see their own addresses
CREATE POLICY "Users can view own addresses" ON addresses
  FOR ALL USING (auth.uid() = profile_id);

-- Materials: Everyone can view active materials
CREATE POLICY "Anyone can view active materials" ON materials
  FOR SELECT USING (is_active = true);

-- Pickups: Users can see pickups they're involved in
CREATE POLICY "Users can view related pickups" ON pickups
  FOR SELECT USING (
    auth.uid() = customer_id OR 
    auth.uid() = collector_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Pickup items: Users can see items for pickups they can access
CREATE POLICY "Users can view pickup items" ON pickup_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE pickups.id = pickup_items.pickup_id
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

-- Pickup photos: Same logic as pickup items
CREATE POLICY "Users can view pickup photos" ON pickup_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE pickups.id = pickup_photos.pickup_id
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

-- Payments: Users can see payments for pickups they can access
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
```

## 🎯 **What's Ready**

✅ **Supabase Client** - `src/lib/supabase.ts`  
✅ **Updated Services** - `src/lib/supabase-services.ts`  
✅ **New Type Definitions** - All interfaces match your schema  
✅ **Profile Management** - Customer, collector, admin roles  
✅ **Address Management** - Multiple addresses per profile  
✅ **Material Management** - Dynamic pricing and units  
✅ **Pickup Workflow** - Submit → Approve/Reject → Payment  
✅ **Photo Management** - Scale, bags, and other photos  
✅ **Payment Processing** - Status tracking and methods  
✅ **Real-time Updates** - Live data synchronization  

## 🚀 **Next Steps**

1. **Set up your Supabase project** with the credentials
2. **Run the SQL commands** to create your tables
3. **Insert sample materials** for testing
4. **Set up RLS policies** for security
5. **Test the complete workflow** with your new database

## 🔍 **Testing**

Once configured, you can test the connection by:

```typescript
import { supabase } from '@/lib/supabase'

// Test connection and get materials
const { data, error } = await supabase.from('materials').select('*')
console.log('Materials:', data)
```

## 📚 **Documentation**

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Your schema is excellent!** It provides a solid foundation for a professional recycling management system with proper relationships, constraints, and extensibility. 🎉
