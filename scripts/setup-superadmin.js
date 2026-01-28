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

async function setupSuperAdmin() {
  try {
    console.log('🚀 Starting superadmin setup for superadmin@wozamali.co.za...');

    // Step 1: Create roles table if it doesn't exist
    console.log('📋 Step 1: Creating roles table...');
    const { error: rolesTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            permissions JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (rolesTableError) {
      console.log('ℹ️ Roles table might already exist:', rolesTableError.message);
    }

    // Step 2: Create users table if it doesn't exist
    console.log('📋 Step 2: Creating users table...');
    const { error: usersTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            first_name TEXT,
            last_name TEXT,
            full_name TEXT,
            phone TEXT,
            role_id UUID REFERENCES public.roles(id),
            role TEXT,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
            employee_number TEXT,
            township TEXT,
            is_approved BOOLEAN DEFAULT false,
            approval_date TIMESTAMPTZ,
            approved_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            last_login TIMESTAMPTZ
        );
      `
    });

    if (usersTableError) {
      console.log('ℹ️ Users table might already exist:', usersTableError.message);
    }

    // Step 3: Insert SUPER_ADMIN role
    console.log('📋 Step 3: Creating SUPER_ADMIN role...');
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
          can_reset_system: true
        }
      }, { onConflict: 'name' });

    if (roleError) {
      console.error('❌ Error creating SUPER_ADMIN role:', roleError);
      return;
    }
    console.log('✅ SUPER_ADMIN role created/updated');

    // Step 4: Check if superadmin@wozamali.co.za exists in auth.users
    console.log('📋 Step 4: Checking auth user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail('superadmin@wozamali.co.za');
    
    if (authError && authError.message.includes('User not found')) {
      console.log('⚠️ User superadmin@wozamali.co.za not found in auth.users');
      console.log('📝 Please create the user in Supabase Dashboard > Authentication > Users');
      console.log('📝 Then run this script again');
      return;
    } else if (authError) {
      console.error('❌ Error checking auth user:', authError);
      return;
    }

    console.log('✅ Auth user found:', authUser.user.id);

    // Step 5: Create/update user in users table
    console.log('📋 Step 5: Creating/updating user in users table...');
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

    // Step 6: Create user_profiles entry for main app compatibility
    console.log('📋 Step 6: Creating user_profiles entry...');
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

    // Step 7: Verification
    console.log('📋 Step 7: Verification...');
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
    console.log('📊 User details:');
    console.log('   ID:', userData.id);
    console.log('   Email:', userData.email);
    console.log('   Name:', userData.full_name);
    console.log('   Role:', userData.role);
    console.log('   Status:', userData.status);
    console.log('   Approved:', userData.is_approved);
    console.log('   Role Name:', userData.roles.name);
    console.log('   Permissions:', JSON.stringify(userData.roles.permissions, null, 2));

    console.log('\n🎉 Superadmin setup complete!');
    console.log('📝 Next steps:');
    console.log('   1. Login to the app with superadmin@wozamali.co.za');
    console.log('   2. You should now see all super admin functions');
    console.log('   3. If you don\'t see the functions, try logging out and back in');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
setupSuperAdmin();
