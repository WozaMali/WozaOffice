# Collections Query Performance Fix

## Problem
The Collections page is experiencing query timeouts (120 seconds) when loading data from `unified_collections` table. This causes:
- Poor user experience
- Repeated timeout errors in console
- Inability to view collections data

## Root Causes
1. **Missing or inefficient database indexes** - Queries are doing full table scans
2. **Too many rows fetched** - Limit of 1000 rows may be too large
3. **No query timeout handling** - Frontend waits too long (120s)
4. **Inefficient query structure** - May be missing proper indexing on `created_at`

## Solutions Implemented

### 1. Database Optimization (Run First)
**File:** `database-scripts/optimize-collections-query-performance.sql`

This script:
- Creates optimized indexes on `unified_collections` table
- Adds composite indexes for common query patterns
- Updates table statistics for better query planning
- Sets reasonable query timeouts

**To apply:**
1. Open Supabase SQL Editor
2. Copy and paste the contents of `optimize-collections-query-performance.sql`
3. Run the script
4. Verify indexes were created (check the output)

### 2. Frontend Query Optimization
**Files Modified:**
- `src/lib/unified-admin-service.ts` - Reduced limit from 1000 to 500, added 30s timeout
- `app/admin/collections/CollectionsContent.tsx` - Removed redundant timeout, improved error handling

**Changes:**
- Reduced query limit from 1000 to 500 rows (prevents timeouts)
- Added 30-second timeout in the service layer
- Improved error messages for users
- Removed duplicate timeout logic

### 3. Background Refresh
The background refresh service already has:
- 30-second refresh interval
- 2-minute cache duration (prevents excessive queries)
- Concurrent refresh prevention

No changes needed here, but the optimizations above will make refreshes faster.

## Testing

After applying the fixes:

1. **Clear browser cache** and hard refresh (Ctrl+Shift+R)
2. **Navigate to Collections page**
3. **Check console** - Should see faster query times (< 5 seconds ideally)
4. **Verify data loads** - Collections should appear without timeout errors

## Expected Results

- Query execution time: < 5 seconds (down from 120+ seconds)
- No timeout errors in console
- Collections data loads successfully
- Background refresh works smoothly

## If Issues Persist

1. **Check database indexes:**
   ```sql
   SELECT indexname, indexdef 
   FROM pg_indexes 
   WHERE tablename = 'unified_collections';
   ```

2. **Check query performance:**
   ```sql
   EXPLAIN ANALYZE 
   SELECT * FROM unified_collections 
   ORDER BY created_at DESC 
   LIMIT 500;
   ```

3. **Consider pagination** - If you have > 10,000 collections, implement pagination instead of loading all at once

4. **Check RLS policies** - Ensure they're not causing performance issues

## Additional Optimizations (If Needed)

If performance is still slow after these fixes:

1. **Implement pagination** - Load 50-100 rows at a time
2. **Add filtering** - Let users filter by status/date before loading
3. **Use materialized views** - For frequently accessed aggregated data
4. **Add database connection pooling** - If using Supabase, ensure proper connection limits

## Monitoring

Watch for these in the console:
- ✅ `Query executed in Xms` - Should be < 5000ms
- ✅ `Collections: Loaded X collections` - Should show data
- ❌ `Query timeout` - Should not appear after fixes
