# 🚀 WozaMali Unified Schema Implementation Guide

## 📋 **Overview**

This guide explains how to implement the new unified database schema across both the **Office App** and **Collector App**. The new schema provides:

- ✅ **Unified user management** with role-based access control
- ✅ **Zone-based collection management** for better organization
- ✅ **Enhanced materials & pricing system** with categories and tiers
- ✅ **Integrated rewards & points system** with administrative control
- ✅ **Real-time data synchronization** across all apps
- ✅ **Comprehensive audit logging** for compliance

## 🗄️ **Database Schema Setup**

### **Step 1: Run the Unified Schema**

1. **Open your Supabase SQL Editor**
2. **Copy and paste** the entire `UNIFIED_SCHEMA.sql` file
3. **Execute the script** to create all tables, functions, and policies

### **Step 2: Verify Schema Creation**

Run these verification queries:

```sql
-- Check all tables were created
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- Check functions were created
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
```

## 🔧 **Office App Implementation**

### **Step 1: Update Type Definitions**

The Office App now uses `src/lib/unified-types.ts` which provides:

- **UserProfile** - Extended user management
- **CollectionPickup** - New pickup structure
- **Material** - Enhanced material system
- **UserWallet** - Points and rewards
- **AdminActionsLog** - Audit trail

### **Step 2: Update Services**

Replace existing services with `src/lib/unified-services.ts`:

```typescript
// Import new services
import { 
  userServices,
  collectionServices,
  materialServices,
  walletAdminServices,
  analyticsServices,
  realtimeServices
} from '@/lib/unified-services'

// Use new services
const users = await userServices.getAllUsers()
const pickups = await collectionServices.getAllPickups()
const materials = await materialServices.getAllMaterials()
```

### **Step 3: Key Administrative Functions**

The Office App now has powerful administrative control:

```typescript
// Reset user wallet
const result = await walletAdminServices.resetUserWallet(
  targetUserId,
  adminUserId,
  'Administrative reset',
  'User requested reset'
)

// Reset user collection metrics
const result = await walletAdminServices.resetUserMetrics(
  targetUserId,
  adminUserId,
  'Start fresh',
  'New collection period'
)

// Adjust user points
const result = await walletAdminServices.adjustUserPoints(
  targetUserId,
  adminUserId,
  100, // Add 100 points
  'bonus',
  'Performance bonus',
  'Excellent work this month'
)

// Get comprehensive user summary
const summary = await walletAdminServices.getUserSummary(
  targetUserId,
  adminUserId
)
```

### **Step 4: Update Components**

Update your existing components to use the new services:

```typescript
// In AdminDashboardClient.tsx
import { legacyServices } from '@/lib/unified-services'

// Replace getRecentActivity() call
const recentActivity = await legacyServices.getRecentActivity()

// In PickupsPage.tsx
import { collectionServices } from '@/lib/unified-services'

// Replace getPickups() call
const pickups = await collectionServices.getAllPickups()
```

## 📱 **Collector App Implementation**

### **Step 1: Update Type Definitions**

The Collector App now uses `collector-app/src/lib/unified-types.ts` with:

- **CollectionPickup** - New pickup workflow
- **CollectionZone** - Zone-based management
- **MaterialWithCategory** - Enhanced materials
- **UserWallet** - Points tracking

### **Step 2: Update Services**

Replace existing services with `collector-app/src/lib/unified-services.ts`:

```typescript
// Import new services
import {
  collectionPickupServices,
  materialServices,
  zoneServices,
  analyticsServices,
  realtimeServices
} from '@/lib/unified-services'

// Use new services
const pickups = await collectionPickupServices.getCollectorPickups(collectorId)
const materials = await materialServices.getAllMaterials()
const zones = await zoneServices.getCollectorZones(collectorId)
```

### **Step 3: Update Pickup Workflow**

The new schema changes how pickups are created:

```typescript
// Create new pickup
const pickupData = {
  pickup_code: `PK-${Date.now()}`, // Generate unique code
  zone_id: selectedZoneId,
  collector_id: collectorId,
  customer_name: customerName,
  customer_phone: customerPhone,
  customer_address: customerAddress,
  scheduled_date: scheduledDate,
  scheduled_time: scheduledTime,
  status: 'scheduled'
}

const pickupId = await collectionPickupServices.createPickup(pickupData)

// Add materials to pickup
const items = [
  {
    material_id: materialId,
    quantity: quantity,
    unit_price: materialPrice,
    quality_rating: qualityRating
  }
]

await pickupItemServices.addPickupItems(pickupId, items)
```

### **Step 4: Update Dashboard Components**

```typescript
// In CollectorDashboard.tsx
import { analyticsServices } from '@/lib/unified-services'

// Get today's metrics
const todayMetrics = await analyticsServices.getTodayMetrics(collectorId)

// Calculate pickup stats
const pickupStats = await analyticsServices.calculatePickupStats(collectorId)
```

## 🔄 **Real-Time Updates**

### **Office App Real-Time**

```typescript
import { realtimeServices } from '@/lib/unified-services'

// Subscribe to all changes
const userProfilesSub = realtimeServices.subscribeToUserProfiles((payload) => {
  console.log('User profile changed:', payload)
  // Update UI accordingly
})

const pickupsSub = realtimeServices.subscribeToCollectionPickups((payload) => {
  console.log('Pickup changed:', payload)
  // Refresh pickup lists
})

const adminActionsSub = realtimeServices.subscribeToAdminActions((payload) => {
  console.log('Admin action logged:', payload)
  // Update admin logs
})
```

### **Collector App Real-Time**

```typescript
import { realtimeServices } from '@/lib/unified-services'

// Subscribe to collector-specific changes
const pickupsSub = realtimeServices.subscribeToCollectorPickups(
  collectorId,
  (payload) => {
    console.log('My pickup changed:', payload)
    // Update pickup lists
  }
)

const walletSub = realtimeServices.subscribeToCollectorWallet(
  userId,
  (payload) => {
    console.log('Wallet updated:', payload)
    // Update points display
  }
)
```

## 🚨 **Breaking Changes & Migration**

### **Table Name Changes**

| Old Table | New Table | Notes |
|-----------|-----------|-------|
| `profiles` | `user_profiles` | Extended with new fields |
| `pickups` | `collection_pickups` | New structure with zones |
| `pickup_items` | `pickup_items` | Same name, new structure |
| `materials` | `materials` | Enhanced with categories |

### **Field Changes**

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `role` | `role` | New values: 'member', 'collector', 'admin', 'office_staff' |
| `status` | `status` | New values: 'active', 'inactive', 'suspended' |
| `rate_per_kg` | `current_price_per_unit` | More flexible pricing |
| `customer_id` | `customer_name` | Direct customer info instead of profile reference |

### **Migration Strategy**

1. **Backup your existing data**
2. **Run the new schema** (it won't affect existing data)
3. **Update your app code** to use new services
4. **Test thoroughly** before going live
5. **Migrate data** if needed (optional)

## 🧪 **Testing the New Schema**

### **Test Office App Functions**

```typescript
// Test wallet reset
const resetResult = await walletAdminServices.resetUserWallet(
  testUserId,
  adminUserId,
  'Test reset'
)
console.log('Reset result:', resetResult)

// Test points adjustment
const adjustResult = await walletAdminServices.adjustUserPoints(
  testUserId,
  adminUserId,
  50,
  'bonus',
  'Test bonus'
)
console.log('Adjustment result:', adjustResult)
```

### **Test Collector App Functions**

```typescript
// Test pickup creation
const pickupId = await collectionPickupServices.createPickup({
  pickup_code: 'TEST-001',
  zone_id: testZoneId,
  collector_id: testCollectorId,
  customer_name: 'Test Customer',
  customer_address: '123 Test St',
  scheduled_date: '2024-01-15'
})

// Test material fetching
const materials = await materialServices.getAllMaterials()
console.log('Materials:', materials)
```

## 📊 **Performance Considerations**

### **Database Indexes**

The new schema includes optimized indexes for:
- User lookups by role and status
- Pickup queries by collector and status
- Material searches by category
- Zone assignments by collector

### **Real-Time Optimization**

- **Filtered subscriptions** for collector-specific data
- **Efficient RLS policies** for security
- **Materialized views** for analytics (if needed)

## 🔒 **Security Features**

### **Row Level Security (RLS)**

- **User profiles**: Users can only see their own profile
- **Pickups**: Collectors see their pickups, admins see all
- **Wallets**: Users see their own wallet, admins see all
- **Admin actions**: Only admins can view admin logs

### **Audit Trail**

All administrative actions are logged with:
- **Who** performed the action
- **What** action was taken
- **When** it happened
- **Why** it was done
- **IP address** for security

## 🚀 **Deployment Checklist**

### **Pre-Deployment**

- [ ] **Backup existing database**
- [ ] **Test new schema** in development
- [ ] **Update all app code** to use new services
- [ ] **Test real-time subscriptions**
- [ ] **Verify admin functions** work correctly

### **Deployment**

- [ ] **Run schema migration** in production
- [ ] **Deploy updated Office App**
- [ ] **Deploy updated Collector App**
- [ ] **Test all functionality** in production
- [ ] **Monitor real-time updates**

### **Post-Deployment**

- [ ] **Verify data integrity**
- [ ] **Check real-time performance**
- [ ] **Monitor admin actions**
- [ ] **Train users** on new features

## 🆘 **Troubleshooting**

### **Common Issues**

1. **"Table does not exist"**
   - Ensure you ran the complete `UNIFIED_SCHEMA.sql`
   - Check table names match exactly

2. **"Function not found"**
   - Verify all functions were created
   - Check function names and parameters

3. **"Permission denied"**
   - Check RLS policies are correct
   - Verify user roles and permissions

4. **Real-time not working**
   - Enable real-time on tables in Supabase
   - Check subscription channel names

### **Debug Queries**

```sql
-- Check if tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies WHERE schemaname = 'public';

-- Check functions
SELECT routine_name, routine_type FROM information_schema.routines 
WHERE routine_schema = 'public';
```

## 🎯 **Next Steps**

1. **Implement the new schema** following this guide
2. **Test thoroughly** in development
3. **Deploy incrementally** to production
4. **Monitor performance** and user feedback
5. **Iterate and improve** based on usage

## 📚 **Additional Resources**

- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **PostgreSQL Documentation**: [postgresql.org/docs](https://postgresql.org/docs)
- **Real-time Subscriptions**: [supabase.com/docs/guides/realtime](https://supabase.com/docs/guides/realtime)

---

**🎉 Congratulations!** You now have a unified, scalable, and secure database schema that will power your WozaMali recycling management system to new heights! 🚀
