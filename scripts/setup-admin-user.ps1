# ============================================================================
# SETUP ADMIN USER FOR WOZA MALI
# ============================================================================
# This PowerShell script helps you set up the admin user for the Woza Mali app

Write-Host "🔧 Setting up Admin User for Woza Mali" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n📋 Instructions:" -ForegroundColor Yellow
Write-Host "1. Open your Supabase Dashboard" -ForegroundColor White
Write-Host "2. Go to SQL Editor" -ForegroundColor White
Write-Host "3. Copy and paste the contents of 'setup-admin-user-complete.sql'" -ForegroundColor White
Write-Host "4. Run the SQL script" -ForegroundColor White
Write-Host "5. Follow the auth user setup instructions in the script" -ForegroundColor White

Write-Host "`n📁 SQL Script Location:" -ForegroundColor Green
Write-Host "   setup-admin-user-complete.sql" -ForegroundColor White

Write-Host "`n🔑 Admin Credentials:" -ForegroundColor Green
Write-Host "   Email: admin@wozamali.com" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White

Write-Host "`n🌐 After setup, you can login at:" -ForegroundColor Green
Write-Host "   http://localhost:8081/admin-login" -ForegroundColor White

Write-Host "`n✅ Setup complete! The admin user will have full access to:" -ForegroundColor Green
Write-Host "   - Admin Dashboard" -ForegroundColor White
Write-Host "   - User Management" -ForegroundColor White
Write-Host "   - System Configuration" -ForegroundColor White
Write-Host "   - Analytics and Reports" -ForegroundColor White

Write-Host "`nPress any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
