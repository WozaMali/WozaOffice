# 🚨 URGENT: Database Fix Required

## The Problem
The collector app is showing these errors:
- `Could not find a relationship between 'pickups' and 'profiles'`
- `insert or update on table "pickups" violates foreign key constraint "pickups_address_id_fkey"`
- `Key is not present in table "addresses"`

## The Root Cause
The database has mismatched foreign key constraints:
- The app is trying to use `user_addresses` table
- But the database constraints still point to old `addresses` table
- The relationship between `pickups` and `profiles` is broken

## The Solution
Run this SQL script to fix all the foreign key relationships:

```sql
\i fix-pickup-relationships-comprehensive.sql
```

## What This Script Does
1. **Checks** what tables exist in your database
2. **Drops** all broken foreign key constraints
3. **Recreates** them with the correct table references
4. **Verifies** the fix worked
5. **Fixes** pickup_items foreign keys too

## After Running the Fix
1. **Refresh** the collector app
2. **Try saving kilograms** again
3. **It should work** without errors
4. **You should see** success messages

## Expected Results
- ✅ Pickup creation will work
- ✅ Kilograms will save properly
- ✅ No more foreign key errors
- ✅ Collection data will be stored

## If You Still Have Issues
The script will show you exactly what tables exist and what constraints were created. This will help identify any remaining issues.

**Run the fix script now to resolve the kilograms save issue!**
