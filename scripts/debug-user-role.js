const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugUserRoles() {
  try {
    console.log('🔍 Debugging User Roles and Team Members Access...');
    
    // Get all users with their roles
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role_id,
        roles!role_id(name)
      `)
      .order('email');
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }
    
    console.log('\n📋 All Users and Their Roles:');
    console.log('=====================================');
    
    users.forEach(user => {
      const roleName = user.roles?.name || 'No role assigned';
      const isSuperAdmin = roleName === 'superadmin' || roleName === 'super_admin';
      const isAdmin = roleName === 'admin' || roleName === 'ADMIN';
      
      console.log(`👤 ${user.email}`);
      console.log(`   Name: ${user.full_name || 'N/A'}`);
      console.log(`   Role: ${roleName}`);
      console.log(`   Can access Team Members: ${isSuperAdmin ? '✅ YES' : '❌ NO'}`);
      console.log(`   Is Admin: ${isAdmin ? '✅ YES' : '❌ NO'}`);
      console.log(`   Is SuperAdmin: ${isSuperAdmin ? '✅ YES' : '❌ NO'}`);
      console.log('---');
    });
    
    // Check specific admin users
    console.log('\n🎯 Checking Specific Admin Users:');
    console.log('==================================');
    
    const adminEmails = ['admin@wozamali.com', 'superadmin@wozamali.co.za'];
    
    for (const email of adminEmails) {
      const user = users.find(u => u.email === email);
      if (user) {
        const roleName = user.roles?.name || 'No role assigned';
        const isSuperAdmin = roleName === 'superadmin' || roleName === 'super_admin';
        
        console.log(`📧 ${email}:`);
        console.log(`   Role: ${roleName}`);
        console.log(`   Can access Team Members: ${isSuperAdmin ? '✅ YES' : '❌ NO'}`);
        
        if (!isSuperAdmin && email === 'admin@wozamali.com') {
          console.log('   ⚠️  This admin user should NOT see Team Members page');
        }
        if (isSuperAdmin && email === 'superadmin@wozamali.co.za') {
          console.log('   ✅ This superadmin user SHOULD see Team Members page');
        }
      } else {
        console.log(`📧 ${email}: ❌ User not found`);
      }
    }
    
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('==========================');
    console.log('1. Clear browser cache and cookies');
    console.log('2. Log out and log back in');
    console.log('3. Check browser console for role detection logs');
    console.log('4. Verify the user is actually logged in as the expected user');
    
    console.log('\n✅ Role debugging completed!');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

debugUserRoles();
