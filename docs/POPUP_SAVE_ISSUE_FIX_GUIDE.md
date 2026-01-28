# Popup Save Issue Fix Guide

## Problem Description
The popup on the member page (collector app) is not saving kilograms (kgs) data when users input material weights and click "Save Collection".

## Root Cause
The issue is caused by a database foreign key constraint mismatch:
- The `pickups` table has a foreign key constraint `pickups_address_id_fkey` that still points to the old `addresses` table
- The application is trying to create pickups with `address_id` from the new `user_addresses` table
- This causes a foreign key constraint violation, preventing the save operation

## Error Flow
```
User inputs kgs → Click "Save Collection" → Create Pickup → Foreign Key Error → Save Fails
```

## Solution

### Method 1: Fix via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Fix Script**
   - Copy and paste the contents of `fix-pickup-constraint-via-app.sql`
   - Execute the script
   - Verify that the constraint was updated successfully

3. **Verify the Fix**
   - The script will show you the before/after state of the foreign key constraints
   - You should see the constraint now points to `user_addresses` table instead of `addresses`

### Method 2: Fix via Database Client

If you have direct database access:

```sql
-- Drop the old constraint
ALTER TABLE public.pickups DROP CONSTRAINT IF EXISTS pickups_address_id_fkey;

-- Add the new constraint
ALTER TABLE public.pickups 
ADD CONSTRAINT pickups_address_id_fkey 
FOREIGN KEY (address_id) REFERENCES public.user_addresses(id) ON DELETE SET NULL;
```

## Testing the Fix

### Step 1: Verify Database Fix
After running the fix script, you should see:
- The foreign key constraint now points to `user_addresses` table
- No more foreign key constraint errors in the database

### Step 2: Test the Popup Save
1. Open the collector app
2. Navigate to the Members page
3. Click "Record Collection" on any member with an address
4. Input kilograms for materials (e.g., 5.5 kg for plastic)
5. Click "Save Collection"
6. Verify that:
   - The popup closes successfully
   - No error messages appear
   - The collection is saved to the database

### Step 3: Check Browser Console
Look for these success messages in the browser console:
```
🔍 About to call pickupServices.createPickup...
✅ Pickup created successfully: [pickup object]
🔍 Creating pickup items for materials: [materials array]
🔍 About to add pickup items: [pickup items array]
✅ Pickup items added successfully
```

## Expected Results After Fix

✅ **Popup Save Works**: Kilograms are saved successfully  
✅ **No Database Errors**: Foreign key constraint violations are resolved  
✅ **Data Persistence**: Collection data is stored in the database  
✅ **User Feedback**: Success message appears after saving  

## Files Involved

- **Database**: `pickups` table foreign key constraint
- **Application**: `WozaMaliOffice/collector-app/src/app/customers/page.tsx` (lines 428-511)
- **Fix Script**: `WozaMaliOffice/fix-pickup-constraint-via-app.sql`

## Why This Happened

The collector app was updated to use the new `user_addresses` schema, but the database foreign key constraint wasn't updated to match. This created a mismatch where:
- The app tries to reference `user_addresses.id`
- But the database constraint still checks `addresses.id`

## Prevention

To prevent similar issues in the future:
1. Always update database constraints when changing table references
2. Test database operations after schema changes
3. Use comprehensive error handling in the application
4. Monitor database logs for constraint violations

## Troubleshooting

If the fix doesn't work:

1. **Check Database Logs**: Look for any remaining constraint errors
2. **Verify Table Structure**: Ensure `user_addresses` table exists and has data
3. **Check Application Logs**: Look for any JavaScript errors in the browser console
4. **Test Database Connection**: Use the "Test DB" button in the collector app

The popup save issue should be completely resolved once the foreign key constraint is fixed!
