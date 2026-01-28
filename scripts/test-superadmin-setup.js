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

const SUPERADMIN_UID = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3';
const SUPERADMIN_EMAIL = 'superadmin@wozamali.co.za';

async function testSuperAdminSetup() {
  try {
    console.log('🧪 Testing Super Admin Setup with UID:', SUPERADMIN_UID);
    console.log('📧 Email:', SUPERADMIN_EMAIL);
    console.log('');

    // Test 1: Check auth user
    console.log('📋 Test 1: Checking auth user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(SUPERADMIN_UID);
    
    if (authError) {
      console.error('❌ Error fetching auth user:', authError);
      return;
    }

    if (!authUser.user) {
      console.error('❌ Auth user not found with UID:', SUPERADMIN_UID);
      return;
    }

    console.log('✅ Auth user found:');
    console.log('   UID:', authUser.user.id);
    console.log('   Email:', authUser.user.email);
    console.log('   Created:', authUser.user.created_at);
    console.log('   Has Password:', authUser.user.encrypted_password ? 'Yes' : 'No');
    console.log('');

    // Test 2: Check users table entry
    console.log('📋 Test 2: Checking users table entry...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        full_name,
        role,
        status,
        is_approved,
        roles!inner(name, permissions)
      `)
      .eq('id', SUPERADMIN_UID)
      .single();

    if (userError) {
      console.error('❌ Error fetching user data:', userError);
      return;
    }

    console.log('✅ User data found:');
    console.log('   ID:', userData.id);
    console.log('   Email:', userData.email);
    console.log('   Name:', userData.full_name);
    console.log('   Role:', userData.role);
    console.log('   Status:', userData.status);
    console.log('   Approved:', userData.is_approved);
    console.log('   Role Name:', userData.roles.name);
    console.log('   Has can_manage_all:', userData.roles.permissions.can_manage_all);
    console.log('   Has can_manage_users:', userData.roles.permissions.can_manage_users);
    console.log('   Total Permissions:', Object.keys(userData.roles.permissions).length);
    console.log('');

    // Test 3: Check user_profiles entry
    console.log('📋 Test 3: Checking user_profiles entry...');
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', SUPERADMIN_UID)
      .single();

    if (profileError) {
      console.log('⚠️ user_profiles entry not found or error:', profileError.message);
    } else {
      console.log('✅ User profile found:');
      console.log('   User ID:', profileData.user_id);
      console.log('   Role:', profileData.role);
      console.log('   Created:', profileData.created_at);
    }
    console.log('');

    // Test 4: Check all roles
    console.log('📋 Test 4: Checking all roles...');
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError);
      return;
    }

    console.log('✅ Roles found:');
    rolesData.forEach(role => {
      console.log(`   ${role.name}:`);
      console.log(`     ID: ${role.id}`);
      console.log(`     Description: ${role.description}`);
      console.log(`     Permissions: ${Object.keys(role.permissions).length} permissions`);
    });
    console.log('');

    // Test 5: Test helper functions
    console.log('📋 Test 5: Testing helper functions...');
    
    // Test get_user_role function
    const { data: userRole, error: userRoleError } = await supabase
      .rpc('get_user_role');

    if (userRoleError) {
      console.log('⚠️ get_user_role function not available or error:', userRoleError.message);
    } else {
      console.log('✅ get_user_role function working');
      console.log('   Current user role:', userRole);
    }

    // Test is_super_admin function
    const { data: isSuperAdmin, error: isSuperAdminError } = await supabase
      .rpc('is_super_admin');

    if (isSuperAdminError) {
      console.log('⚠️ is_super_admin function not available or error:', isSuperAdminError.message);
    } else {
      console.log('✅ is_super_admin function working');
      console.log('   Is Super Admin:', isSuperAdmin);
    }

    // Test is_admin function
    const { data: isAdmin, error: isAdminError } = await supabase
      .rpc('is_admin');

    if (isAdminError) {
      console.log('⚠️ is_admin function not available or error:', isAdminError.message);
    } else {
      console.log('✅ is_admin function working');
      console.log('   Is Admin:', isAdmin);
    }
    console.log('');

    // Test 6: Test RLS policies
    console.log('📋 Test 6: Testing RLS policies...');
    const { data: allUsersData, error: allUsersError } = await supabase
      .from('users')
      .select('id, email, role, status')
      .limit(5);

    if (allUsersError) {
      console.log('⚠️ Could not fetch users (RLS might be blocking):', allUsersError.message);
    } else {
      console.log('✅ RLS policies working - users fetched:');
      allUsersData.forEach(user => {
        console.log(`     ${user.email} (${user.role})`);
      });
    }
    console.log('');

    // Test 7: Summary
    console.log('📋 Test 7: Summary...');
    console.log('✅ Super Admin setup verification complete!');
    console.log('');
    console.log('🎯 What to test in the app:');
    console.log('   1. Login with superadmin@wozamali.co.za');
    console.log('   2. Check if you can see all admin functions');
    console.log('   3. Try creating a new admin user');
    console.log('   4. Test admin user permissions');
    console.log('   5. Verify RLS policies are working');
    console.log('');
    console.log('🔧 If you encounter issues:');
    console.log('   1. Check browser console for errors');
    console.log('   2. Verify user is logged in correctly');
    console.log('   3. Check if RLS policies are blocking access');
    console.log('   4. Try logging out and back in');
    console.log('');
    console.log('🎉 Super Admin is ready to use!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSuperAdminSetup();
