# Table Inconsistency Issue Found

## Root Cause Identified
The popup save issue is caused by **table inconsistency** in the service functions:

- **`createPickup`** function uses `collections` table
- **Other pickup functions** use `pickups` table  
- **Foreign key constraint** is on `pickups` table
- **Error occurs** when trying to insert into `collections` but constraint expects `pickups`

## The Problem

### Service Function Inconsistency
```typescript
// createPickup function (WRONG TABLE):
.from('collections')
.insert([{
  user_id: pickupData.customer_id,
  pickup_address_id: pickupData.address_id,
  // ...
}])

// Other pickup functions (CORRECT TABLE):
.from('pickups')
.select('*')
.eq('status', 'submitted')
```

### Foreign Key Constraint Mismatch
- **Database Constraint**: `pickups_address_id_fkey` on `pickups` table
- **Service Function**: Trying to insert into `collections` table
- **Result**: Foreign key constraint violation

## Why This Happened

The service functions were likely updated at different times:
1. Some functions were updated to use `pickups` table
2. `createPickup` function was left using `collections` table
3. Foreign key constraint was set up for `pickups` table
4. This created a mismatch between what the service tries to do and what the database expects

## The Fix

### Option 1: Fix createPickup to use pickups table (Recommended)
Update the `createPickup` function to use the `pickups` table like the other functions:

```typescript
// Change from:
.from('collections')
.insert([{
  user_id: pickupData.customer_id,
  pickup_address_id: pickupData.address_id,
  // ...
}])

// To:
.from('pickups')
.insert([{
  customer_id: pickupData.customer_id,
  address_id: pickupData.address_id,
  // ...
}])
```

### Option 2: Update foreign key constraint to collections table
Move the foreign key constraint from `pickups` to `collections` table.

## Files to Fix

1. **Service Function**: `WozaMaliOffice/collector-app/src/lib/supabase-services.ts`
   - Line 340: Change `from('collections')` to `from('pickups')`
   - Update column names to match `pickups` table structure

2. **Database Constraint**: Already fixed in previous steps

## Expected Results After Fix

- ✅ **Consistent Table Usage**: All pickup functions use the same table
- ✅ **Foreign Key Works**: Constraint matches the table being used
- ✅ **Popup Save Works**: Collections can be saved successfully
- ✅ **No More Errors**: Foreign key constraint violations resolved

## Testing the Fix

1. **Apply the Service Fix**: Update `createPickup` to use `pickups` table
2. **Test Popup Save**: Try saving a collection
3. **Verify Success**: Check that no foreign key errors occur
4. **Check Data**: Verify pickup is created in the correct table

This table inconsistency is the actual root cause of the popup save issue!
