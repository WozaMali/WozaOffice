const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljtjntkddwkcjixkyuy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in environment variables');
  process.exit(1);
}

// Create Supabase client with anon key
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugSuperAdmin() {
  try {
    console.log('🔍 Debugging superadmin setup...\n');

    // Check if we can connect to the database
    console.log('📋 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return;
    }
    console.log('✅ Database connection successful');

    // Check if superadmin user exists in users table
    console.log('\n📋 Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'superadmin@wozamali.co.za');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    if (users && users.length > 0) {
      console.log('✅ User found in users table:');
      console.log('   ID:', users[0].id);
      console.log('   Email:', users[0].email);
      console.log('   Role:', users[0].role);
      console.log('   Status:', users[0].status);
    } else {
      console.log('❌ User not found in users table');
      console.log('📝 You need to run the SQL setup script first');
      return;
    }

    // Check if roles table exists and has SUPER_ADMIN role
    console.log('\n📋 Checking roles table...');
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .eq('name', 'SUPER_ADMIN');

    if (rolesError) {
      console.log('⚠️ Error fetching roles (might be RLS issue):', rolesError.message);
    } else if (roles && roles.length > 0) {
      console.log('✅ SUPER_ADMIN role found:');
      console.log('   ID:', roles[0].id);
      console.log('   Name:', roles[0].name);
      console.log('   Permissions:', JSON.stringify(roles[0].permissions, null, 2));
    } else {
      console.log('❌ SUPER_ADMIN role not found');
      console.log('📝 You need to run the SQL setup script first');
    }

    // Check auth user
    console.log('\n📋 Checking auth user...');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.log('ℹ️ No authenticated user (this is normal if not logged in)');
      } else {
        console.log('✅ Authenticated user found:');
        console.log('   ID:', authData.user.id);
        console.log('   Email:', authData.user.email);
        console.log('   Created:', authData.user.created_at);
      }
    } catch (err) {
      console.log('ℹ️ Auth check failed (normal if not logged in)');
    }

    console.log('\n📝 Next steps:');
    console.log('1. Run the SQL verification script in Supabase SQL Editor');
    console.log('2. Create the auth user in Supabase Dashboard > Authentication > Users');
    console.log('3. Set a password for superadmin@wozamali.co.za');
    console.log('4. Try logging in to the app');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugSuperAdmin();
