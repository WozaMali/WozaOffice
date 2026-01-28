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

async function testPermissions() {
  try {
    console.log('🧪 Testing Super Admin and Admin Permissions...');
    console.log('');

    // Test 1: Check if superadmin user exists and has correct role
    console.log('📋 Test 1: Checking superadmin user...');
    const { data: superadminData, error: superadminError } = await supabase
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
      .eq('email', 'superadmin@wozamali.co.za')
      .single();

    if (superadminError) {
      console.error('❌ Error fetching superadmin user:', superadminError);
      return;
    }

    console.log('✅ Superadmin user found:');
    console.log('   Email:', superadminData.email);
    console.log('   Name:', superadminData.full_name);
    console.log('   Role:', superadminData.role);
    console.log('   Status:', superadminData.status);
    console.log('   Approved:', superadminData.is_approved);
    console.log('   Role Name:', superadminData.roles.name);
    console.log('   Has can_manage_all:', superadminData.roles.permissions.can_manage_all);
    console.log('   Has can_manage_users:', superadminData.roles.permissions.can_manage_users);
    console.log('');

    // Test 2: Check all roles and their permissions
    console.log('📋 Test 2: Checking all roles and permissions...');
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
      console.log(`     Description: ${role.description}`);
      console.log(`     Permissions: ${Object.keys(role.permissions).length} permissions`);
      console.log(`     Key permissions: ${Object.keys(role.permissions).slice(0, 5).join(', ')}`);
    });
    console.log('');

    // Test 3: Test helper functions
    console.log('📋 Test 3: Testing helper functions...');
    
    // Test get_user_permissions function
    const { data: permissionsData, error: permissionsError } = await supabase
      .rpc('get_user_permissions');

    if (permissionsError) {
      console.log('⚠️ get_user_permissions function not available or error:', permissionsError.message);
    } else {
      console.log('✅ get_user_permissions function working');
      console.log('   Permissions:', JSON.stringify(permissionsData, null, 2));
    }

    // Test get_all_users function
    const { data: allUsersData, error: allUsersError } = await supabase
      .rpc('get_all_users');

    if (allUsersError) {
      console.log('⚠️ get_all_users function not available or error:', allUsersError.message);
    } else {
      console.log('✅ get_all_users function working');
      console.log('   Users found:', allUsersData.length);
      allUsersData.forEach(user => {
        console.log(`     ${user.email} (${user.role})`);
      });
    }
    console.log('');

    // Test 4: Check RLS policies
    console.log('📋 Test 4: Checking RLS policies...');
    const { data: policiesData, error: policiesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd
          FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename IN ('users', 'roles')
          ORDER BY tablename, policyname;
        `
      });

    if (policiesError) {
      console.log('⚠️ Could not check RLS policies:', policiesError.message);
    } else {
      console.log('✅ RLS policies found:');
      policiesData.forEach(policy => {
        console.log(`   ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
      });
    }
    console.log('');

    // Test 5: Test creating a test admin user
    console.log('📋 Test 5: Testing user creation...');
    const testAdminEmail = 'test-admin@wozamali.co.za';
    
    // First, check if test admin already exists
    const { data: existingTestAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('email', testAdminEmail)
      .single();

    if (existingTestAdmin) {
      console.log('ℹ️ Test admin already exists, skipping creation test');
    } else {
      const { data: createUserData, error: createUserError } = await supabase
        .rpc('create_user', {
          user_email: testAdminEmail,
          user_first_name: 'Test',
          user_last_name: 'Admin',
          user_role: 'ADMIN',
          user_phone: '+27123456789'
        });

      if (createUserError) {
        console.log('⚠️ create_user function not available or error:', createUserError.message);
      } else {
        console.log('✅ create_user function working');
        console.log('   Created user:', createUserData);
      }
    }
    console.log('');

    // Test 6: Summary
    console.log('📋 Test 6: Summary...');
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

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPermissions();
