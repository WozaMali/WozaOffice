# Profiles Table Mapping Fix Guide

## Problem Description

The collector app is encountering a 404 error when trying to access the `profiles` table:

```
GET https://mljtjntkddwkcjixkyuy.supabase.co/rest/v1/profiles?select=id%2Cemail%2Crole&limit=1 404 (Not Found)
```

**Error Details:**
- **Code:** PGRST205
- **Message:** "Could not find the table 'public.profiles' in the schema cache"
- **Hint:** "Perhaps you meant the table 'public.user_profiles'"

## Root Cause

The collector app was built expecting a `profiles` table, but your current database schema uses `user_profiles`. This creates a naming mismatch that prevents the app from functioning.

## Solution Options

### Option 1: Create a Database View (Recommended)

The simplest and most maintainable solution is to create a `profiles` view that maps to `user_profiles`.

**File:** `create-profiles-view.sql`

**Benefits:**
- ✅ No data duplication
- ✅ Automatic synchronization
- ✅ Easy to maintain
- ✅ Minimal performance impact

**How it works:**
1. Creates a `profiles` view that selects from `user_profiles`
2. Maps field names for compatibility (e.g., `status` → `is_active`)
3. Uses triggers to handle INSERT/UPDATE/DELETE operations
4. Maintains data consistency automatically

### Option 2: Create a Separate Table with Triggers

**File:** `fix-profiles-table-mapping.sql`

**Benefits:**
- ✅ Full control over table structure
- ✅ Can add custom fields if needed
- ✅ Works with any database system

**Drawbacks:**
- ❌ Data duplication
- ❌ More complex maintenance
- ❌ Potential for data inconsistency

## Implementation Steps

### Step 1: Choose Your Solution

**For most cases, use Option 1 (View approach):**
```bash
# Run the view creation script
psql -h your-host -U your-user -d your-database -f create-profiles-view.sql
```

**If you need custom fields or have specific requirements, use Option 2:**
```bash
# Run the table creation script
psql -h your-host -U your-user -d your-database -f fix-profiles-table-mapping.sql
```

### Step 2: Verify the Fix

After running either script, verify that the `profiles` table/view exists:

```sql
-- Check if profiles table/view exists
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- Test a simple query
SELECT id, email, role FROM profiles LIMIT 1;
```

### Step 3: Test the Collector App

1. Restart your collector app development server
2. Check the browser console for any remaining errors
3. Verify that profile-related operations work correctly

## Field Mapping

The view automatically maps these fields for compatibility:

| profiles (View) | user_profiles (Table) |
|----------------|----------------------|
| `is_active` | `status = 'active'` |
| `username` | `full_name` |
| `first_name` | First part of `full_name` |
| `last_name` | Second part of `full_name` |

## Troubleshooting

### Common Issues

1. **Permission Errors**
   ```sql
   -- Grant necessary permissions
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
   GRANT SELECT ON public.profiles TO anon;
   ```

2. **Trigger Function Errors**
   - Ensure PostgreSQL functions are created successfully
   - Check for syntax errors in the trigger functions

3. **Data Type Mismatches**
   - Verify that field types match between view and table
   - Check for NULL constraint violations

### Verification Queries

```sql
-- Check view structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test data access
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM user_profiles;

-- Compare sample data
SELECT 'profiles' as source, id, email, role, is_active FROM profiles LIMIT 3
UNION ALL
SELECT 'user_profiles' as source, id, email, role, 
       CASE WHEN status = 'active' THEN true ELSE false END as is_active 
FROM user_profiles LIMIT 3;
```

## Long-term Considerations

### Option A: Keep the View (Recommended)
- Maintains backward compatibility
- Single source of truth for user data
- Easy to modify field mappings

### Option B: Update Frontend Code
- Gradually migrate collector app to use `user_profiles`
- Update all `.from('profiles')` calls to `.from('user_profiles')`
- More work but cleaner architecture

### Option C: Hybrid Approach
- Use view for immediate fix
- Plan gradual migration to unified schema
- Best of both worlds

## Files Created

1. **`create-profiles-view.sql`** - Recommended solution using database view
2. **`fix-profiles-table-mapping.sql`** - Alternative using separate table with triggers
3. **`PROFILES_TABLE_FIX_GUIDE.md`** - This comprehensive guide

## Next Steps

1. **Immediate:** Run the view creation script to fix the 404 error
2. **Short-term:** Test the collector app functionality
3. **Long-term:** Consider migrating to unified schema naming conventions

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify database permissions and user roles
3. Check PostgreSQL logs for detailed error messages
4. Ensure all required functions and triggers are created successfully
