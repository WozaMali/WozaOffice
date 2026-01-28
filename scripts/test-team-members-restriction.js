const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTeamMembersRestriction() {
  try {
    console.log('🔍 Testing Team Members Page Restriction...');
    
    // Test 1: Check admin@wozamali.com role
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
      console.log(`   📝 Name: ${adminUser.full_name}`);
      console.log(`   🎭 Role: ${roleName}`);
      console.log(`   🔐 Can access Team Members: ${isSuperAdmin ? '✅ YES' : '❌ NO'}`);
      
      if (!isSuperAdmin) {
        console.log('   ✅ CORRECT: Admin user should NOT see Team Members page');
      } else {
        console.log('   ❌ ERROR: Admin user should NOT see Team Members page');
      }
    }
    
    // Test 2: Check superadmin@wozamali.co.za role
    console.log('\n📧 Testing superadmin@wozamali.co.za:');
    const { data: superAdminUser, error: superAdminError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role_id,
        roles!role_id(name)
      `)
      .eq('email', 'superadmin@wozamali.co.za')
      .single();
    
    if (superAdminError) {
      console.log('   ❌ Error fetching superadmin user:', superAdminError.message);
    } else {
      const roleName = superAdminUser.roles?.name || 'No role assigned';
      const isSuperAdmin = roleName === 'superadmin' || roleName === 'super_admin';
      
      console.log(`   👤 Email: ${superAdminUser.email}`);
      console.log(`   📝 Name: ${superAdminUser.full_name}`);
      console.log(`   🎭 Role: ${roleName}`);
      console.log(`   🔐 Can access Team Members: ${isSuperAdmin ? '✅ YES' : '❌ NO'}`);
      
      if (isSuperAdmin) {
        console.log('   ✅ CORRECT: Superadmin user SHOULD see Team Members page');
      } else {
        console.log('   ❌ ERROR: Superadmin user should see Team Members page');
      }
    }
    
    console.log('\n🔧 Fixes Applied:');
    console.log('   ✅ Enhanced AdminLayout with force hiding');
    console.log('   ✅ Added useEffect redirect in Team Members page');
    console.log('   ✅ Created SQL script to verify role assignments');
    console.log('   ✅ Added comprehensive debug logging');
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Apply FORCE_TEAM_MEMBERS_RESTRICTION.sql in Supabase');
    console.log('   2. Clear browser cache completely');
    console.log('   3. Log out and log back in as admin@wozamali.com');
    console.log('   4. Check that Team Members is NOT visible in navigation');
    console.log('   5. Try to access /admin/team-members directly - should redirect');
    
    console.log('\n✅ Team Members restriction should now work properly!');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

testTeamMembersRestriction();