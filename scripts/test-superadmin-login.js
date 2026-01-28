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

async function testSuperAdminLogin() {
  try {
    console.log('🔍 Testing Super Admin login...\n');

    // Test 1: Check if user exists in users table
    console.log('📋 Step 1: Checking users table...');
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
      console.log('📝 Run the SQL setup script first');
      return;
    }

    // Test 2: Check if auth user exists
    console.log('\n📋 Step 2: Checking auth user...');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.log('ℹ️ No authenticated user (normal if not logged in)');
        console.log('📝 You need to create the auth user in Supabase Dashboard');
      } else {
        console.log('✅ Authenticated user found:');
        console.log('   ID:', authData.user.id);
        console.log('   Email:', authData.user.email);
        console.log('   Created:', authData.user.created_at);
      }
    } catch (err) {
      console.log('ℹ️ Auth check failed (normal if not logged in)');
    }

    // Test 3: Test authentication logic
    console.log('\n📋 Step 3: Testing authentication logic...');
    
    // Simulate the isAdminUser function
    const isAdminUser = (user, profile) => {
      if (!user) return false;
      
      // Check profile role first (from database)
      if (profile?.role) {
        const role = profile.role.toLowerCase();
        return ['admin', 'super_admin', 'superadmin'].includes(role);
      }
      
      // Special case: superadmin@wozamali.co.za should always be treated as super admin
      const email = user.email?.toLowerCase() || '';
      if (email === 'superadmin@wozamali.co.za') {
        return true;
      }
      
      // Fallback to other admin emails
      return email === 'admin@wozamali.com' || 
             email.includes('admin@wozamali');
    };

    // Test with mock data
    const mockUser = { email: 'superadmin@wozamali.co.za' };
    const mockProfile = { role: users[0].role };
    
    const isAdmin = isAdminUser(mockUser, mockProfile);
    console.log('✅ Authentication logic test:');
    console.log('   User email:', mockUser.email);
    console.log('   Profile role:', mockProfile.role);
    console.log('   Is admin user:', isAdmin);

    console.log('\n📝 Next steps:');
    console.log('1. Run the SQL fix script in Supabase SQL Editor');
    console.log('2. Create the auth user in Supabase Dashboard > Authentication > Users');
    console.log('3. Set a password for superadmin@wozamali.co.za');
    console.log('4. Test the Super Admin login tab');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSuperAdminLogin();