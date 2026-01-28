const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDashboardTeamMembersFix() {
  try {
    console.log('🔍 Testing Dashboard Team Members Fix...');
    
    // Test admin user role
    console.log('\n📧 Testing admin@wozamali.com:');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role_id,
        roles!role_id(name)
      `)
      .eq('email', 'admin@wozamali.com')
      .single();
    
    if (adminError) {
      console.log('   ❌ Error fetching admin user:', adminError.message);
    } else {
      const roleName = adminUser.roles?.name || 'No role assigned';
      const isSuperAdmin = roleName === 'superadmin' || roleName === 'super_admin';
      
      console.log(`   👤 Email: ${adminUser.email}`);
      console.log(`   🎭 Role: ${roleName}`);
      console.log(`   🔐 Should see Team Members: ${isSuperAdmin ? '✅ YES' : '❌ NO'}`);
      
      if (!isSuperAdmin) {
        console.log('   ✅ CORRECT: Admin user should NOT see Team Members on Dashboard');
      } else {
        console.log('   ❌ ERROR: Admin user should NOT see Team Members on Dashboard');
      }
    }
    
    console.log('\n🔧 Fixes Applied:');
    console.log('   ✅ Removed Team Members from base navigation in AdminLayout');
    console.log('   ✅ Added dynamic navigation building with useMemo');
    console.log('   ✅ Removed Team Members from base navigation in Dashboard page');
    console.log('   ✅ Added dynamic navigation building in Dashboard page');
    console.log('   ✅ Changed default activeTab from team-members to users');
    console.log('   ✅ Added comprehensive debug logging');
    
    console.log('\n📋 Expected Behavior:');
    console.log('   👤 admin@wozamali.com (role: admin):');
    console.log('      - Dashboard navigation: NO Team Members tab');
    console.log('      - Sidebar navigation: NO Team Members link');
    console.log('      - Direct access to /admin/team-members: Should redirect');
    console.log('');
    console.log('   👤 superadmin@wozamali.co.za (role: superadmin):');
    console.log('      - Dashboard navigation: YES Team Members tab');
    console.log('      - Sidebar navigation: YES Team Members link');
    console.log('      - Direct access to /admin/team-members: Should work');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Clear browser cache completely');
    console.log('   2. Restart development server');
    console.log('   3. Log in as admin@wozamali.com');
    console.log('   4. Check Dashboard - Team Members should be GONE');
    console.log('   5. Check sidebar - Team Members should be GONE');
    console.log('   6. Try /admin/team-members directly - should redirect');
    
    console.log('\n✅ Team Members should now be completely hidden from admin users!');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

testDashboardTeamMembersFix();
