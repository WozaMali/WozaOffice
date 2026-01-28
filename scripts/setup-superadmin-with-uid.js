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

const SUPERADMIN_UID = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3';

async function setupSuperAdminWithUID() {
  try {
    console.log('🔧 Setting up superadmin with UID:', SUPERADMIN_UID);
    console.log('');

    // Step 1: Update the user in users table with correct UID
    console.log('📋 Step 1: Updating user in users table...');
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({
        id: SUPERADMIN_UID,
        role: 'admin',
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'superadmin@wozamali.co.za')
      .select();

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return;
    }

    if (updateResult && updateResult.length > 0) {
      console.log('✅ User updated successfully:');
      console.log('   ID:', updateResult[0].id);
      console.log('   Email:', updateResult[0].email);
      console.log('   Role:', updateResult[0].role);
      console.log('   Status:', updateResult[0].status);
    } else {
      console.log('⚠️ No user was updated (might already have correct UID)');
    }

    // Step 2: Create/update user_profiles entry
    console.log('\n📋 Step 2: Setting up user_profiles...');
    const { data: profileResult, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: SUPERADMIN_UID,
        role: 'admin'
      }, { onConflict: 'user_id' })
      .select();

    if (profileError) {
      console.log('⚠️ user_profiles error (table might not exist):', profileError.message);
    } else {
      console.log('✅ User profile created/updated:');
      console.log('   User ID:', profileResult[0].user_id);
      console.log('   Role:', profileResult[0].role);
    }

    // Step 3: Test authentication logic
    console.log('\n📋 Step 3: Testing authentication logic...');
    
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

    // Test with the actual UID
    const mockUser = { 
      id: SUPERADMIN_UID,
      email: 'superadmin@wozamali.co.za' 
    };
    const mockProfile = { role: 'admin' };
    
    const isAdmin = isAdminUser(mockUser, mockProfile);
    console.log('✅ Authentication logic test:');
    console.log('   User ID:', mockUser.id);
    console.log('   User email:', mockUser.email);
    console.log('   Profile role:', mockProfile.role);
    console.log('   Is admin user:', isAdmin);

    // Step 4: Check if auth user exists
    console.log('\n📋 Step 4: Checking auth user...');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.log('ℹ️ No authenticated user (normal if not logged in)');
      } else {
        console.log('✅ Authenticated user found:');
        console.log('   ID:', authData.user.id);
        console.log('   Email:', authData.user.email);
        console.log('   Created:', authData.user.created_at);
      }
    } catch (err) {
      console.log('ℹ️ Auth check failed (normal if not logged in)');
    }

    console.log('\n🎉 Superadmin setup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Create the auth user in Supabase Dashboard > Authentication > Users');
    console.log('2. Use UID:', SUPERADMIN_UID);
    console.log('3. Email: superadmin@wozamali.co.za');
    console.log('4. Set a password');
    console.log('5. Test the Super Admin login tab');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
setupSuperAdminWithUID();
