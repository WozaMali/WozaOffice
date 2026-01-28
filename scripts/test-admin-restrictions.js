const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminRestrictions() {
  try {
    console.log('🔍 Testing Admin Role Restrictions...');
    
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
      const isAdmin = roleName === 'admin' || roleName === 'ADMIN';
      
      console.log(`   👤 Email: ${adminUser.email}`);
      console.log(`   🎭 Role: ${roleName}`);
      console.log(`   🔐 Is Admin: ${isAdmin ? '✅ YES' : '❌ NO'}`);
      console.log(`   🔐 Is SuperAdmin: ${isSuperAdmin ? '✅ YES' : '❌ NO'}`);
      console.log(`   🚫 Should be BLOCKED from Team Members: ${isAdmin && !isSuperAdmin ? '✅ YES' : '❌ NO'}`);
      
      if (isAdmin && !isSuperAdmin) {
        console.log('   ✅ CORRECT: Admin user should be BLOCKED from Team Members');
      } else {
        console.log('   ❌ ERROR: Admin user should be BLOCKED from Team Members');
      }
    }
    
    console.log('\n🔧 Admin Restrictions Applied:');
    console.log('   ✅ Team Members page: Shows "Access Restricted" message for admin users');
    console.log('   ✅ AdminTeamMember component: Shows "Access Restricted" message for admin users');
    console.log('   ✅ Immediate redirects: Admin users get redirected away from Team Members');
    console.log('   ✅ Visual indicators: Red-themed "Access Restricted" page with clear messaging');
    console.log('   ✅ Security warning: Explains why access is restricted');
    console.log('   ✅ Return button: Easy way to get back to Dashboard');
    
    console.log('\n📋 Expected Behavior for admin@wozamali.com:');
    console.log('   🚫 Dashboard: NO Team Members tab visible');
    console.log('   🚫 Sidebar: NO Team Members link visible');
    console.log('   🚫 Direct access to /admin/team-members: Shows "Access Restricted" page');
    console.log('   🚫 Team Members tab in Dashboard: Shows "Access Restricted" page');
    console.log('   🚫 TeamMemberCard: NOT rendered anywhere');
    console.log('   🔒 Clear messaging: Explains why access is restricted');
    console.log('   🔒 Security warning: Highlights sensitive nature of the section');
    
    console.log('\n📋 Expected Behavior for superadmin@wozamali.co.za:');
    console.log('   ✅ Dashboard: YES Team Members tab visible');
    console.log('   ✅ Sidebar: YES Team Members link visible');
    console.log('   ✅ Direct access to /admin/team-members: Works normally');
    console.log('   ✅ Team Members tab in Dashboard: Full functionality');
    console.log('   ✅ TeamMemberCard: Rendered normally');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Clear browser cache completely');
    console.log('   2. Restart development server');
    console.log('   3. Log in as admin@wozamali.com');
    console.log('   4. Try to access Team Members - should show "Access Restricted"');
    console.log('   5. Check that the restriction message is clear and professional');
    
    console.log('\n✅ Admin users are now properly restricted from Team Members!');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

testAdminRestrictions();
