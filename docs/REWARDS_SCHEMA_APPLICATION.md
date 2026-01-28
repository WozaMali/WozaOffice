# 🎯 Rewards & Metrics System - Database Setup Guide

## 📋 **Prerequisites**
- Access to Supabase Dashboard
- Database permissions (admin role)
- SQL Editor access

## 🚀 **Step 1: Access Supabase SQL Editor**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

## 🗄️ **Step 2: Apply the Complete Schema**

Copy and paste the entire content of `rewards-metrics-system-schema-fixed.sql` into the SQL Editor and execute it.

**Important Notes:**
- The schema includes `DROP POLICY IF EXISTS` statements to handle existing policies
- All tables will be created with proper RLS (Row Level Security)
- Functions and triggers will be set up automatically

## ✅ **Step 3: Verify Schema Creation**

After running the schema, verify these tables were created:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'external_services',
  'enhanced_wallets',
  'reward_definitions',
  'user_rewards',
  'donation_campaigns',
  'user_donations',
  'withdrawal_requests',
  'user_metrics',
  'system_metrics',
  'webhook_endpoints',
  'webhook_deliveries'
);
```

## 🔐 **Step 4: Test RLS Policies**

Verify that Row Level Security is working:

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('enhanced_wallets', 'user_rewards', 'user_metrics');
```

## 🧪 **Step 5: Test Basic Operations**

### **Test 1: Check Default Data**
The schema should have created some default data. Verify it exists:

```sql
-- Check default external services
SELECT * FROM external_services;

-- Check default reward definitions
SELECT * FROM reward_definitions;
```

### **Test 2: Test Functions**
Verify the database functions were created:

```sql
-- Test the add_to_sync_queue function
SELECT add_to_sync_queue(
  (SELECT id FROM external_services WHERE service_name = 'default-wallet-service' LIMIT 1),
  'wallet_update',
  'wallet',
  gen_random_uuid(),
  '{"test": "data"}'::jsonb,
  1
);
```

### **Test 3: Test Table Structure**
Verify the table structures are correct:

```sql
-- Check enhanced_wallets table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'enhanced_wallets' 
ORDER BY ordinal_position;

-- Check reward_definitions table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reward_definitions' 
ORDER BY ordinal_position;
```

## ⚠️ **Troubleshooting**

### **Policy Already Exists Error**
- The fixed schema includes `DROP POLICY IF EXISTS` statements
- If you still get errors, manually drop policies first

### **Permission Denied**
- Ensure you're using an admin account
- Check that RLS policies are properly configured

### **Function Not Found**
- Verify all functions were created successfully
- Check the function creation logs

### **UUID Format Errors**
- Never use placeholder text like `'your-test-user-id'`
- Use `gen_random_uuid()` to generate valid UUIDs
- Or use actual user IDs from your `auth.users` table

## 🔄 **Next Steps After Schema Application**

1. **Test the unified system** at `http://localhost:8081`
2. **Verify database connectivity** in the app
3. **Test wallet and rewards functionality**
4. **Create test users and wallets**

## 📞 **Support**

If you encounter issues:
1. Check the Supabase logs
2. Verify your database permissions
3. Ensure all environment variables are set correctly
4. Use the test commands above to verify functionality

---

**Ready to proceed?** Once the schema is applied and tested, we can test the rewards functionality in the UI!
