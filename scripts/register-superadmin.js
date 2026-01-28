const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljtjntkddwkcjixkyuy.supabase.co';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function registerSuperAdmin() {
  try {
    console.log('🚀 Starting Super Admin registration process...');
    console.log('📧 Email: superadmin@wozamali.co.za');
    console.log('🔑 Password: (will be set in Supabase Dashboard)');
    console.log('');

    // Step 1: Check if auth user exists
    console.log('📋 Step 1: Checking if superadmin@wozamali.co.za exists in auth.users...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail('superadmin@wozamali.co.za');
    
    if (authError && authError.message.includes('User not found')) {
      console.log('⚠️ User superadmin@wozamali.co.za not found in auth.users');
      console.log('');
      console.log('📝 MANUAL STEP REQUIRED:');
      console.log('   1. Go to Supabase Dashboard > Authentication > Users');
      console.log('   2. Click "Add user"');
      console.log('   3. Email: superadmin@wozamali.co.za');
      console.log('   4. Password: (set a strong password)');
      console.log('   5. Confirm email: Yes');
      console.log('   6. Click "Create user"');
      console.log('');
      console.log('📝 After creating the user, run this script again to complete the setup');
      return;
    } else if (authError) {
      console.error('❌ Error checking auth user:', authError);
      return;
    }

    console.log('✅ Auth user found:', authUser.user.id);
    console.log('📧 Email:', authUser.user.email);
    console.log('📅 Created:', authUser.user.created_at);
    console.log('');

    // Step 2: Create/Update SUPER_ADMIN role
    console.log('📋 Step 2: Creating/updating SUPER_ADMIN role...');
    const { error: roleError } = await supabase
      .from('roles')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'SUPER_ADMIN',
        description: 'Super Administrator with full system access',
        permissions: {
          can_manage_all: true,
          can_view_analytics: true,
          can_manage_users: true,
          can_access_team_members: true,
          can_manage_collections: true,
          can_manage_pickups: true,
          can_manage_rewards: true,
          can_manage_withdrawals: true,
          can_manage_fund: true,
          can_manage_config: true,
          can_view_transactions: true,
          can_manage_beneficiaries: true,
          can_reset_system: true,
          can_manage_roles: true,
          can_manage_permissions: true,
          can_access_admin_panel: true,
          can_manage_system_settings: true
        }
      }, { onConflict: 'name' });

    if (roleError) {
      console.error('❌ Error creating SUPER_ADMIN role:', roleError);
      return;
    }
    console.log('✅ SUPER_ADMIN role created/updated');

    // Step 3: Create/Update ADMIN role
    console.log('📋 Step 3: Creating/updating ADMIN role...');
    const { error: adminRoleError } = await supabase
      .from('roles')
      .upsert({
        id: '00000000-0000-0000-0000-000000000002',
        name: 'ADMIN',
        description: 'System Administrator with management privileges',
        permissions: {
          can_manage_users: true,
          can_view_analytics: true,
          can_manage_collections: true,
          can_manage_pickups: true,
          can_manage_rewards: true,
          can_manage_withdrawals: true,
          can_view_transactions: true,
          can_manage_beneficiaries: true,
          can_access_admin_panel: true,
          can_approve_collections: true,
          can_manage_team_members: true
        }
      }, { onConflict: 'name' });

    if (adminRoleError) {
      console.error('❌ Error creating ADMIN role:', adminRoleError);
      return;
    }
    console.log('✅ ADMIN role created/updated');

    // Step 4: Create/Update user in users table
    console.log('📋 Step 4: Creating/updating user in users table...');
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: authUser.user.id,
        email: 'superadmin@wozamali.co.za',
        first_name: 'Super',
        last_name: 'Admin',
        full_name: 'Super Admin',
        role_id: '00000000-0000-0000-0000-000000000001',
        role: 'SUPER_ADMIN',
        status: 'active',
        is_approved: true
      }, { onConflict: 'email' });

    if (userError) {
      console.error('❌ Error creating/updating user:', userError);
      return;
    }
    console.log('✅ User created/updated in users table');

    // Step 5: Create user_profiles entry for main app compatibility
    console.log('📋 Step 5: Creating user_profiles entry...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: authUser.user.id,
        role: 'SUPER_ADMIN'
      }, { onConflict: 'user_id' });

    if (profileError) {
      console.log('ℹ️ user_profiles table might not exist or error occurred:', profileError.message);
    } else {
      console.log('✅ User profile created/updated');
    }

    // Step 6: Verification
    console.log('📋 Step 6: Verification...');
    const { data: userData, error: userDataError } = await supabase
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

    if (userDataError) {
      console.error('❌ Error fetching user data:', userDataError);
      return;
    }

    console.log('✅ Verification successful!');
    console.log('');
    console.log('📊 Super Admin Details:');
    console.log('   ID:', userData.id);
    console.log('   Email:', userData.email);
    console.log('   Name:', userData.full_name);
    console.log('   Role:', userData.role);
    console.log('   Status:', userData.status);
    console.log('   Approved:', userData.is_approved);
    console.log('   Role Name:', userData.roles.name);
    console.log('   Permissions:', JSON.stringify(userData.roles.permissions, null, 2));
    console.log('');

    // Step 7: Check admin role
    console.log('📋 Step 7: Checking ADMIN role...');
    const { data: adminRoleData, error: adminRoleDataError } = await supabase
      .from('roles')
      .select('*')
      .eq('name', 'ADMIN')
      .single();

    if (adminRoleDataError) {
      console.error('❌ Error fetching ADMIN role:', adminRoleDataError);
    } else {
      console.log('✅ ADMIN role verified');
      console.log('   Name:', adminRoleData.name);
      console.log('   Permissions:', JSON.stringify(adminRoleData.permissions, null, 2));
    }

    console.log('');
    console.log('🎉 Super Admin registration complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Login to the app with superadmin@wozamali.co.za');
    console.log('   2. You should now see all super admin functions');
    console.log('   3. If you don\'t see the functions, try logging out and back in');
    console.log('   4. Test creating admin users with proper permissions');
    console.log('');

  } catch (error) {
    console.error('❌ Registration failed:', error);
  }
}

// Run the registration
registerSuperAdmin();
