const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRoleMapping() {
  try {
    console.log('🔍 Testing Role Mapping...');
    
    // Test the role mapping query
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id, 
        email, 
        full_name, 
        phone, 
        status, 
        role_id,
        roles!role_id(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }
    
    console.log('\n📊 User Role Mapping Results:');
    console.log('=====================================');
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User: ${user.email}`);
      console.log(`   Full Name: ${user.full_name || 'N/A'}`);
      console.log(`   Role ID: ${user.role_id || 'N/A'}`);
      console.log(`   Role Name: ${user.roles?.name || 'N/A'}`);
      console.log(`   Status: ${user.status || 'N/A'}`);
      
      // Check if this is the admin user
      if (user.email === 'admin@wozamali.com') {
        console.log(`   🎯 ADMIN USER DETECTED:`);
        console.log(`   Expected Role: admin`);
        console.log(`   Actual Role: ${user.roles?.name || 'N/A'}`);
        if (user.roles?.name === 'admin') {
          console.log(`   ✅ Role mapping is CORRECT`);
        } else if (user.roles?.name === 'superadmin') {
          console.log(`   ❌ Role mapping is INCORRECT - admin is being recognized as superadmin`);
        } else {
          console.log(`   ⚠️ Role mapping is UNKNOWN - role: ${user.roles?.name}`);
        }
      }
    });
    
    console.log('\n🔧 Role Mapping Fix Applied:');
    console.log('   - Updated query to join with roles table');
    console.log('   - Changed role mapping from role_id to roles.name');
    console.log('   - This should fix admin being recognized as superadmin');
    
    console.log('\n✅ Role mapping test completed!');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

testRoleMapping();
