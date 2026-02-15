const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateDumisaniRole() {
  try {
    const email = 'dumisani@sebenzawaste.co.za';
    console.log(`🚀 Updating role for ${email} to superadmin...\n`);

    // Step 1: Find the user
    console.log('📋 Step 1: Finding user...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, role_id, status')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError?.message || 'User does not exist');
      console.log('\n💡 Trying case-insensitive search...');
      const { data: users } = await supabase
        .from('users')
        .select('id, email, full_name, role, role_id, status')
        .ilike('email', email);
      
      if (!users || users.length === 0) {
        console.error('❌ User not found with case-insensitive search either');
        process.exit(1);
      }
      console.log('✅ Found user:', users[0]);
      user = users[0];
    } else {
      console.log('✅ Found user:', user);
    }

    // Step 2: Ensure SUPER_ADMIN role exists
    console.log('\n📋 Step 2: Ensuring SUPER_ADMIN role exists...');
    const superAdminRoleId = '00000000-0000-0000-0000-000000000001';
    
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .or('name.eq.SUPER_ADMIN,name.eq.super_admin,name.eq.superadmin')
      .limit(1)
      .single();

    let roleId = superAdminRoleId;
    let roleName = 'superadmin';

    if (roleError || !role) {
      console.log('⚠️ SUPER_ADMIN role not found, creating it...');
      const { data: newRole, error: createError } = await supabase
        .from('roles')
        .insert({
          id: superAdminRoleId,
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
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating role:', createError);
        // Try to get any existing superadmin role
        const { data: existingRoles } = await supabase
          .from('roles')
          .select('id, name')
          .or('name.eq.SUPER_ADMIN,name.eq.super_admin,name.eq.superadmin')
          .limit(1);
        
        if (existingRoles && existingRoles.length > 0) {
          roleId = existingRoles[0].id;
          roleName = existingRoles[0].name.toLowerCase() === 'super_admin' ? 'superadmin' : existingRoles[0].name.toLowerCase();
          console.log('✅ Using existing role:', roleName);
        } else {
          console.error('❌ Could not create or find SUPER_ADMIN role');
          process.exit(1);
        }
      } else {
        roleId = newRole.id;
        roleName = 'superadmin';
        console.log('✅ Created SUPER_ADMIN role');
      }
    } else {
      roleId = role.id;
      roleName = role.name.toLowerCase() === 'super_admin' ? 'superadmin' : role.name.toLowerCase();
      console.log('✅ Found role:', roleName);
    }

    // Step 3: Update user role
    console.log('\n📋 Step 3: Updating user role...');
    const { error: updateError } = await supabase
      .from('users')
      .update({
        role_id: roleId,
        role: roleName,
        status: 'active',
        is_approved: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Error updating user role:', updateError);
      process.exit(1);
    }

    console.log('✅ User role updated successfully');

    // Step 4: Update user_profiles if it exists
    console.log('\n📋 Step 4: Updating user_profiles table...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        role: roleName,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.log('⚠️ user_profiles table might not exist or user not found there:', profileError.message);
    } else {
      console.log('✅ user_profiles updated');
    }

    // Step 5: Verify the update
    console.log('\n📋 Step 5: Verifying update...');
    const { data: updatedUser, error: verifyError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        role_id,
        status,
        is_approved,
        roles!role_id(id, name)
      `)
      .eq('id', user.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
    } else {
      console.log('\n✅ Update verified successfully!');
      console.log('📊 Updated user details:');
      console.log('   Email:', updatedUser.email);
      console.log('   Name:', updatedUser.full_name || 'N/A');
      console.log('   Role:', updatedUser.role);
      console.log('   Role Name (from roles table):', updatedUser.roles?.name || 'N/A');
      console.log('   Status:', updatedUser.status);
      console.log('   Approved:', updatedUser.is_approved);
    }

    console.log('\n🎉 Role update completed successfully!');
    console.log(`   ${email} is now a ${roleName}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

updateDumisaniRole();
