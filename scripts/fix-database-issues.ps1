# ============================================================================
# FIX DATABASE ISSUES FOR WOZA MALI ADMIN DASHBOARD
# ============================================================================
# This script helps you fix the database issues causing pickup fetch errors

Write-Host "🔧 Fixing Database Issues for Woza Mali Admin Dashboard" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

Write-Host "`n🚨 Issue Detected:" -ForegroundColor Red
Write-Host "   Error fetching recent pickups: {}" -ForegroundColor White
Write-Host "   This usually means missing database tables or data" -ForegroundColor White

Write-Host "`n📋 Solution Steps:" -ForegroundColor Yellow
Write-Host "1. Open your Supabase Dashboard" -ForegroundColor White
Write-Host "2. Go to SQL Editor" -ForegroundColor White
Write-Host "3. Copy and paste the contents of 'diagnose-database-issues.sql'" -ForegroundColor White
Write-Host "4. Run the SQL script" -ForegroundColor White
Write-Host "5. Check the output for any errors or missing tables" -ForegroundColor White

Write-Host "`n🔍 What the script will do:" -ForegroundColor Green
Write-Host "   ✅ Check if all required tables exist" -ForegroundColor White
Write-Host "   ✅ Verify table structures" -ForegroundColor White
Write-Host "   ✅ Create missing tables if needed" -ForegroundColor White
Write-Host "   ✅ Insert default materials" -ForegroundColor White
Write-Host "   ✅ Create test pickup data if none exists" -ForegroundColor White
Write-Host "   ✅ Verify everything is working" -ForegroundColor White

Write-Host "`n📁 SQL Script Location:" -ForegroundColor Green
Write-Host "   diagnose-database-issues.sql" -ForegroundColor White

Write-Host "`n🌐 After running the script:" -ForegroundColor Green
Write-Host "1. Refresh your admin dashboard at http://localhost:8081/admin" -ForegroundColor White
Write-Host "2. Check the browser console for any remaining errors" -ForegroundColor White
Write-Host "3. Navigate to the Pickups tab to see the data" -ForegroundColor White

Write-Host "`n✅ Expected Results:" -ForegroundColor Green
Write-Host "   - No more 'Error fetching recent pickups' messages" -ForegroundColor White
Write-Host "   - Pickup data visible in the admin dashboard" -ForegroundColor White
Write-Host "   - Kilogram totals showing correctly" -ForegroundColor White
Write-Host "   - Customer names and collection details" -ForegroundColor White

Write-Host "`n🚨 If you still see errors:" -ForegroundColor Red
Write-Host "1. Check the SQL script output for any error messages" -ForegroundColor White
Write-Host "2. Verify your Supabase connection is working" -ForegroundColor White
Write-Host "3. Check that your admin user has proper permissions" -ForegroundColor White

Write-Host "`nPress any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
