# ============================================================================
# TEST ADMIN DASHBOARD DATA
# ============================================================================
# This script helps you test the admin dashboard data

Write-Host "🧪 Testing Admin Dashboard Data" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

Write-Host "`n📋 Steps to test admin dashboard:" -ForegroundColor Yellow
Write-Host "1. Run the SQL script 'test-pickup-data.sql' in your Supabase SQL Editor" -ForegroundColor White
Write-Host "2. Check if you have pickup data in your database" -ForegroundColor White
Write-Host "3. If no data exists, uncomment the test data creation section" -ForegroundColor White
Write-Host "4. Refresh your admin dashboard at http://localhost:8081/admin" -ForegroundColor White

Write-Host "`n🔍 What to look for in the admin dashboard:" -ForegroundColor Green
Write-Host "   - Total Pickups count" -ForegroundColor White
Write-Host "   - Total Weight (kg) collected" -ForegroundColor White
Write-Host "   - Total Revenue from collections" -ForegroundColor White
Write-Host "   - Recent pickup activities" -ForegroundColor White
Write-Host "   - Analytics data (if you go to Analytics tab)" -ForegroundColor White

Write-Host "`n📊 Expected data structure:" -ForegroundColor Green
Write-Host "   - Pickups table: Contains pickup records" -ForegroundColor White
Write-Host "   - Pickup_items table: Contains individual items with kilograms" -ForegroundColor White
Write-Host "   - Materials table: Contains material types and rates" -ForegroundColor White
Write-Host "   - Profiles table: Contains customer and collector information" -ForegroundColor White

Write-Host "`n🚨 Common issues:" -ForegroundColor Red
Write-Host "   - No pickup data: Run the test data creation section" -ForegroundColor White
Write-Host "   - Import errors: Fixed with the updated admin-services.ts" -ForegroundColor White
Write-Host "   - Authentication issues: Make sure admin user is set up" -ForegroundColor White

Write-Host "`n✅ After running the SQL script, you should see:" -ForegroundColor Green
Write-Host "   - Pickup data with customer names" -ForegroundColor White
Write-Host "   - Kilogram totals for each pickup" -ForegroundColor White
Write-Host "   - Material breakdowns" -ForegroundColor White
Write-Host "   - Revenue calculations" -ForegroundColor White

Write-Host "`n🌐 Admin Dashboard URLs:" -ForegroundColor Green
Write-Host "   Main Dashboard: http://localhost:8081/admin" -ForegroundColor White
Write-Host "   Pickups Page: http://localhost:8081/admin (click Pickups tab)" -ForegroundColor White
Write-Host "   Analytics Page: http://localhost:8081/admin (click Analytics tab)" -ForegroundColor White

Write-Host "`nPress any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
