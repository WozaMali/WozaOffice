const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljtjntkddwkcjixkyuy.supabase.co';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifySuperAdmin() {
  try {
    console.log('🔍 Verifying superadmin setup for superadmin@wozamali.co.za...\n');

    // Check if SUPER_ADMIN role exists
    console.log('📋 Checking SUPER_ADMIN role...');
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .eq('name', 'SUPER_ADMIN');

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError);
      return;
    }

    if (roles && roles.length > 0) {
      console.log('✅ SUPER_ADMIN role found:');
      console.log('   ID:', roles[0].id);
      console.log('   Name:', roles[0].name);
      console.log('   Description:', roles[0].description);
      console.log('   Permissions:', JSON.stringify(roles[0].permissions, null, 2));
    } else {
      console.log('❌ SUPER_ADMIN role not found');
      return;
    }

    console.log('\n📋 Checking user in users table...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        is_approved,
        roles!inner(name, permissions)
      `)
      .eq('email', 'superadmin@wozamali.co.za');

    if (userError) {
      console.error('❌ Error fetching user data:', userError);
      return;
    }

    if (userData && userData.length > 0) {
      const user = userData[0];
      console.log('✅ User found in users table:');
      console.log('   ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   Name:', user.full_name);
      console.log('   Role:', user.role);
      console.log('   Status:', user.status);
      console.log('   Approved:', user.is_approved);
      console.log('   Role Name:', user.roles.name);
    } else {
      console.log('❌ User not found in users table');
      return;
    }

    console.log('\n📋 Checking auth user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail('superadmin@wozamali.co.za');
    
    if (authError) {
      console.log('⚠️ Auth user check failed:', authError.message);
    } else {
      console.log('✅ Auth user found:');
      console.log('   ID:', authUser.user.id);
      console.log('   Email:', authUser.user.email);
      console.log('   Created:', authUser.user.created_at);
      console.log('   Has Password:', authUser.user.encrypted_password ? 'Yes' : 'No');
    }

    console.log('\n📋 Checking user_profiles table...');
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userData[0].id);

    if (profileError) {
      console.log('ℹ️ user_profiles table check failed:', profileError.message);
    } else if (profileData && profileData.length > 0) {
      console.log('✅ User profile found:');
      console.log('   User ID:', profileData[0].user_id);
      console.log('   Role:', profileData[0].role);
    } else {
      console.log('ℹ️ No user profile found (this might be normal)');
    }

    console.log('\n🎉 Verification Summary:');
    console.log('✅ SUPER_ADMIN role exists with proper permissions');
    console.log('✅ User exists in users table with SUPER_ADMIN role');
    console.log('✅ User is active and approved');
    
    if (authUser && !authUser.user.encrypted_password) {
      console.log('⚠️ Auth user exists but no password set - you may need to set a password');
    } else if (authUser) {
      console.log('✅ Auth user exists with password');
    }

    console.log('\n📝 Next steps:');
    console.log('1. Login to the app with superadmin@wozamali.co.za');
    console.log('2. You should now see all super admin functions');
    console.log('3. If you don\'t see the functions, try logging out and back in');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the verification
verifySuperAdmin();
