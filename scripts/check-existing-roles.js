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

async function checkRoles() {
  try {
    console.log('🔍 Checking existing roles...\n');

    // Check what roles exist
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*');

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError);
      return;
    }

    if (roles && roles.length > 0) {
      console.log('✅ Found roles:');
      roles.forEach(role => {
        console.log(`   - ${role.name} (${role.id})`);
        console.log(`     Description: ${role.description}`);
        console.log(`     Permissions: ${JSON.stringify(role.permissions, null, 2)}`);
        console.log('');
      });
    } else {
      console.log('❌ No roles found in roles table');
    }

    // Check what the user's role_id points to
    console.log('📋 Checking user role_id...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role, role_id')
      .eq('email', 'superadmin@wozamali.co.za')
      .single();

    if (userError) {
      console.error('❌ Error fetching user:', userError);
      return;
    }

    console.log('User details:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Role (text):', user.role);
    console.log('   Role ID (UUID):', user.role_id);

    // If role_id exists, check what it points to
    if (user.role_id) {
      const { data: roleData, error: roleDataError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', user.role_id)
        .single();

      if (roleDataError) {
        console.log('⚠️ Role ID points to non-existent role:', roleDataError.message);
      } else {
        console.log('✅ Role ID points to:', roleData.name);
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
checkRoles();
