const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceTeamMembersRestriction() {
  try {
    console.log('🔒 Forcing Team Members Page Restriction...');
    
    // Step 1: Check current admin user role
    const { data: adminUser, error } = await supabase
      .from('users')
      .select(`
        id, 
        email, 
        full_name, 
        role_id,
        roles!role_id(name)
      `)
      .eq('email', 'admin@wozamali.com')
      .single();
    
    if (error) {
      console.error('❌ Error fetching admin user:', error);
      return;
    }
    
    console.log('\n📊 Current Admin User Status:');
    console.log('   Email:', adminUser.email);
    console.log('   Role ID:', adminUser.role_id);
    console.log('   Role Name:', adminUser.roles?.name);
    
    // Step 2: Force update admin user to have 'admin' role (not superadmin)
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();
    
    if (roleError) {
      console.error('❌ Error fetching admin role:', roleError);
      return;
    }
    
    console.log('\n🔧 Forcing Admin Role Assignment...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ role_id: adminRole.id })
      .eq('email', 'admin@wozamali.com');
    
    if (updateError) {
      console.error('❌ Error updating admin role:', updateError);
      return;
    }
    
    console.log('✅ Admin role updated successfully');
    
    // Step 3: Verify the update
    const { data: updatedAdmin, error: verifyError } = await supabase
      .from('users')
      .select(`
        id, 
        email, 
        full_name, 
        role_id,
        roles!role_id(name)
      `)
      .eq('email', 'admin@wozamali.com')
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }
    
    console.log('\n✅ Updated Admin User Status:');
    console.log('   Email:', updatedAdmin.email);
    console.log('   Role ID:', updatedAdmin.role_id);
    console.log('   Role Name:', updatedAdmin.roles?.name);
    
    // Step 4: Test role filtering logic
    const userRole = updatedAdmin.roles?.name;
    const isSuperAdmin = userRole === 'superadmin' || userRole === 'super_admin';
    
    console.log('\n🔍 Role Filtering Test:');
    console.log('   User Role:', userRole);
    console.log('   Is Super Admin:', isSuperAdmin);
    console.log('   Should see Team Members:', isSuperAdmin);
    
    if (isSuperAdmin) {
      console.log('\n❌ PROBLEM: Admin is still recognized as superadmin!');
      console.log('   This indicates a deeper issue with role mapping.');
    } else {
      console.log('\n✅ SUCCESS: Admin is correctly recognized as admin');
      console.log('   Team Members page should now be hidden.');
    }
    
    console.log('\n🚨 If Team Members is still visible:');
    console.log('   1. Clear browser cache completely (Ctrl+Shift+Delete)');
    console.log('   2. Try incognito/private browsing mode');
    console.log('   3. Check browser console for role information');
    console.log('   4. Restart the development server');
    console.log('   5. Verify you are logged in as admin@wozamali.com');
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

forceTeamMembersRestriction();
