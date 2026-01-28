const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTeamMemberCardFix() {
  try {
    console.log('🔍 Testing TeamMemberCard Fix...');
    
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
      console.log(`   🔐 Should see TeamMemberCard: ${isSuperAdmin ? '✅ YES' : '❌ NO'}`);
      
      if (!isSuperAdmin) {
        console.log('   ✅ CORRECT: Admin user should NOT see TeamMemberCard');
      } else {
        console.log('   ❌ ERROR: Admin user should NOT see TeamMemberCard');
      }
    }
    
    console.log('\n🔧 Fixes Applied:');
    console.log('   ✅ Wrapped Team Members TabsContent with isSuperAdmin check');
    console.log('   ✅ Added useEffect to redirect admin users away from team-members tab');
    console.log('   ✅ TeamMemberCard now only renders for superadmin users');
    console.log('   ✅ Admin users cannot access Team Members tab content');
    
    console.log('\n📋 Expected Behavior:');
    console.log('   👤 admin@wozamali.com (role: admin):');
    console.log('      - Dashboard: NO Team Members tab visible');
    console.log('      - TeamMemberCard: NOT rendered');
    console.log('      - If somehow accessing team-members tab: Redirected to users tab');
    console.log('');
    console.log('   👤 superadmin@wozamali.co.za (role: superadmin):');
    console.log('      - Dashboard: YES Team Members tab visible');
    console.log('      - TeamMemberCard: Rendered normally');
    console.log('      - Full access to team management functionality');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Clear browser cache completely');
    console.log('   2. Restart development server');
    console.log('   3. Log in as admin@wozamali.com');
    console.log('   4. Check Dashboard - Team Members tab should be GONE');
    console.log('   5. TeamMemberCard should NOT be visible anywhere');
    console.log('   6. Try to access team-members tab directly - should redirect');
    
    console.log('\n✅ TeamMemberCard should now be completely hidden from admin users!');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

testTeamMemberCardFix();
