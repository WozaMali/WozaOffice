# ============================================================================
# FIX MATERIALS TABLE ISSUE
# ============================================================================
# This script guides you through fixing the materials table column issue

Write-Host "🔧 Fixing Materials Table Issue" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

Write-Host "`n🚨 Issue Detected:" -ForegroundColor Red
Write-Host "   ERROR: 42703: column 'co2_saved_per_kg' of relation 'materials' does not exist" -ForegroundColor White
Write-Host "   The materials table is missing environmental impact columns" -ForegroundColor White

Write-Host "`n📋 Solution Steps:" -ForegroundColor Yellow
Write-Host "1. Open your Supabase Dashboard" -ForegroundColor White
Write-Host "2. Go to SQL Editor" -ForegroundColor White
Write-Host "3. Copy and paste the contents of 'fix-materials-simple.sql' (recommended)" -ForegroundColor White
Write-Host "   OR use 'fix-materials-table.sql' if you prefer" -ForegroundColor White
Write-Host "4. Run the SQL script" -ForegroundColor White
Write-Host "5. Check the output for success messages" -ForegroundColor White

Write-Host "`n🔍 What the script will do:" -ForegroundColor Green
Write-Host "   ✅ Check current materials table structure" -ForegroundColor White
Write-Host "   ✅ Add missing columns (co2_saved_per_kg, water_saved_per_kg, energy_saved_per_kg)" -ForegroundColor White
Write-Host "   ✅ Add description and is_active columns" -ForegroundColor White
Write-Host "   ✅ Update existing materials with environmental impact data" -ForegroundColor White
Write-Host "   ✅ Insert default materials if none exist" -ForegroundColor White
Write-Host "   ✅ Verify everything is working" -ForegroundColor White

Write-Host "`n📁 SQL Script Locations:" -ForegroundColor Green
Write-Host "   fix-materials-simple.sql (recommended - no constraint issues)" -ForegroundColor White
Write-Host "   fix-materials-table.sql (alternative)" -ForegroundColor White

Write-Host "`n🌐 After running the script:" -ForegroundColor Green
Write-Host "1. Go back to your Supabase SQL Editor" -ForegroundColor White
Write-Host "2. Run the 'diagnose-database-issues.sql' script again" -ForegroundColor White
Write-Host "3. This time it should complete successfully" -ForegroundColor White
Write-Host "4. Refresh your admin dashboard at http://localhost:8081/admin" -ForegroundColor White

Write-Host "`n✅ Expected Results:" -ForegroundColor Green
Write-Host "   - No more column errors" -ForegroundColor White
Write-Host "   - Materials table has all required columns" -ForegroundColor White
Write-Host "   - Environmental impact data populated" -ForegroundColor White
Write-Host "   - Admin dashboard shows pickup data correctly" -ForegroundColor White

Write-Host "`n🚨 If you still see errors:" -ForegroundColor Red
Write-Host "1. Check the SQL script output for any error messages" -ForegroundColor White
Write-Host "2. Make sure you have admin permissions in Supabase" -ForegroundColor White
Write-Host "3. Try running the script in smaller sections" -ForegroundColor White

Write-Host "`nPress any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
