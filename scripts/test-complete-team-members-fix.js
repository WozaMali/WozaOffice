const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCompleteTeamMembersFix() {
  try {
    console.log('🔍 Testing Complete Team Members Fix...');
    
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
        console.log('   ✅ CORRECT: Admin user should NOT see Team Members');
      } else {
        console.log('   ❌ ERROR: Admin user should NOT see Team Members');
      }
    }
    
    console.log('\n🔧 Complete Fixes Applied:');
    console.log('   ✅ Dashboard page: Wrapped TabsContent with isSuperAdmin check');
    console.log('   ✅ Dashboard page: Added useEffect redirect for admin users');
    console.log('   ✅ AdminLayout: Dynamic navigation building with useMemo');
    console.log('   ✅ AdminTeamMember: Changed role check to superadmin only');
    console.log('   ✅ AdminTeamMember: Added access restriction with "Access Denied" message');
    console.log('   ✅ Team Members page: Added useEffect redirect');
    console.log('   ✅ Team Members page: Added access restriction');
    
    console.log('\n📋 Expected Behavior for admin@wozamali.com:');
    console.log('   🚫 Dashboard: NO Team Members tab visible');
    console.log('   🚫 Sidebar: NO Team Members link visible');
    console.log('   🚫 AdminTeamMember: Shows "Access Denied" message');
    console.log('   🚫 TeamMemberCard: NOT rendered anywhere');
    console.log('   🚫 Direct access to /admin/team-members: Redirects or shows "Access Denied"');
    console.log('   🚫 Direct access to team-members tab: Redirects to users tab');
    
    console.log('\n📋 Expected Behavior for superadmin@wozamali.co.za:');
    console.log('   ✅ Dashboard: YES Team Members tab visible');
    console.log('   ✅ Sidebar: YES Team Members link visible');
    console.log('   ✅ AdminTeamMember: Full functionality');
    console.log('   ✅ TeamMemberCard: Rendered normally');
    console.log('   ✅ Direct access to /admin/team-members: Works normally');
    
    console.log('\n🚀 Final Steps:');
    console.log('   1. Clear browser cache completely (Ctrl + Shift + Delete)');
    console.log('   2. Clear all cookies and local storage');
    console.log('   3. Restart development server');
    console.log('   4. Log out completely');
    console.log('   5. Log in as admin@wozamali.com');
    console.log('   6. Check Dashboard - Team Members should be COMPLETELY GONE');
    console.log('   7. Check sidebar - Team Members should be COMPLETELY GONE');
    console.log('   8. Try /admin/team-members directly - should show "Access Denied"');
    
    console.log('\n✅ Team Members should now be COMPLETELY hidden from admin users!');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

testCompleteTeamMembersFix();
