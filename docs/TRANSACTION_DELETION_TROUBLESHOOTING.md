# Transaction Deletion Troubleshooting Guide

## Issue: Money is deleted but transaction still shows in UI

### Step 1: Run the RLS Fix Script
**CRITICAL**: You must run the RLS permissions script first!

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix-wallet-transactions-rls.sql`
4. Execute the script
5. Verify the policies were created successfully

### Step 2: Check Browser Console
1. Open the Office App transactions page
2. Open browser Developer Tools (F12)
3. Go to Console tab
4. Try to delete a transaction
5. Look for these log messages:
   - `🗑️ Attempting to delete transaction with ID: [ID]`
   - `✅ Transaction deletion successful. Rows affected: [count]`
   - `❌ Error deleting monetary transaction: [error]`

### Step 3: Test RLS Policies
Run this in your browser console on the transactions page:

```javascript
// Copy and paste the contents of test-transaction-deletion.js
```

### Step 4: Common Issues and Solutions

#### Issue: 403 Forbidden Error
**Symptoms**: Console shows "permission denied for table wallet_transactions"
**Solution**: 
1. Run the `fix-wallet-transactions-rls.sql` script
2. Verify you're logged in as an admin user
3. Check that your user profile has `role = 'admin'`

#### Issue: Transaction Deleted but UI Not Updated
**Symptoms**: Transaction disappears from database but still shows in UI
**Solution**: 
1. The updated code now includes automatic refresh
2. Wait 1 second after deletion for the refresh to occur
3. Manually refresh the page if needed

#### Issue: No Rows Affected
**Symptoms**: Console shows "Rows affected: 0"
**Solution**:
1. Check if the transaction ID exists
2. Verify the transaction meets the deletion criteria (amount > 0 for monetary, points > 0 for points)
3. Check if the transaction was already deleted

### Step 5: Verify Database State
Run this SQL query in Supabase SQL Editor:

```sql
-- Check if RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'wallet_transactions' 
AND schemaname = 'public'
ORDER BY policyname;

-- Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'wallet_transactions' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- Check current transactions
SELECT id, user_id, transaction_type, amount, points, source_id, created_at
FROM wallet_transactions 
ORDER BY created_at DESC 
LIMIT 10;
```

### Step 6: Manual Verification
1. Delete a transaction through the UI
2. Check the browser console for success/error messages
3. Refresh the page manually
4. Verify the transaction is gone from the list
5. Check the database directly to confirm deletion

### Expected Behavior After Fix
1. ✅ Click delete button on a transaction
2. ✅ Confirmation dialog appears
3. ✅ Click "Delete" in dialog
4. ✅ Console shows successful deletion logs
5. ✅ Transaction disappears from UI immediately
6. ✅ Page refreshes automatically after 1 second
7. ✅ Transaction count updates correctly

### Still Having Issues?
1. Check that you're logged in as an admin user
2. Verify the RLS script was executed successfully
3. Check browser console for any JavaScript errors
4. Try logging out and logging back in
5. Clear browser cache and cookies
6. Check Supabase logs for any server-side errors

### Debug Information to Collect
If the issue persists, collect this information:
1. Browser console logs during deletion attempt
2. User role and ID from the profile
3. Transaction ID that failed to delete
4. Any error messages from Supabase
5. Results of the RLS policy verification queries
