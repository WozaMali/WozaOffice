const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugAdminRole() {
  try {
    console.log('🔍 Debugging Admin Role Access...');
    
    // Check admin user role
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
    
    console.log('\n📊 Admin User Details:');
    console.log('   Email:', adminUser.email);
    console.log('   Full Name:', adminUser.full_name);
    console.log('   Role ID:', adminUser.role_id);
    console.log('   Role Name:', adminUser.roles?.name);
    
    // Test role filtering logic
    const userRole = adminUser.roles?.name;
    const isSuperAdmin = userRole === 'superadmin' || userRole === 'super_admin';
    
    console.log('\n🔧 Role Filtering Logic:');
    console.log('   User Role:', userRole);
    console.log('   Is Super Admin:', isSuperAdmin);
    console.log('   Should see Team Members:', isSuperAdmin);
    
    // Test navigation filtering
    const navigationItems = [
      { name: 'Dashboard', href: '/admin', superadminOnly: false },
      { name: 'Team Members', href: '/admin/team-members', superadminOnly: true },
      { name: 'Users', href: '/admin/users', superadminOnly: false },
      { name: 'Settings', href: '/admin/settings', superadminOnly: false }
    ];
    
    const filteredItems = navigationItems.filter(item => {
      if (item.superadminOnly && !isSuperAdmin) {
        return false;
      }
      return true;
    });
    
    console.log('\n📱 Navigation Items for Admin User:');
    filteredItems.forEach(item => {
      console.log(`   ${item.superadminOnly ? '🔐' : '✅'} ${item.name}`);
    });
    
    console.log('\n🎯 Expected Results:');
    console.log('   ✅ Dashboard (visible)');
    console.log('   ❌ Team Members (hidden - superadmin only)');
    console.log('   ✅ Users (visible)');
    console.log('   ✅ Settings (visible)');
    
    if (isSuperAdmin) {
      console.log('\n❌ PROBLEM: Admin user is being recognized as superadmin!');
      console.log('   This means the role mapping is still incorrect.');
    } else {
      console.log('\n✅ GOOD: Admin user is correctly recognized as admin');
      console.log('   Team Members page should be hidden.');
    }
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

debugAdminRole();
