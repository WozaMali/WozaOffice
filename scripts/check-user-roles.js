const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserRoles() {
  console.log('👥 USER ROLES CHECK\n');
  
  try {
    // Get all users with their roles
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        role_id,
        created_at,
        roles!role_id(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`📊 Found ${users?.length || 0} users:\n`);

    users?.forEach((user, index) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      const displayName = fullName || user.email || 'Unknown';
      const roleName = user.roles?.name || 'Unknown Role';
      
      console.log(`${index + 1}. ${displayName}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   📱 Phone: ${user.phone || 'Not provided'}`);
      console.log(`   🎭 Role: ${roleName}`);
      console.log(`   🆔 User ID: ${user.id}`);
      console.log(`   🆔 Role ID: ${user.role_id}`);
      console.log(`   📅 Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log('');
    });

    // Summary by role
    const roleCounts = {};
    users?.forEach(user => {
      const roleName = user.roles?.name || 'Unknown';
      roleCounts[roleName] = (roleCounts[roleName] || 0) + 1;
    });

    console.log('📈 SUMMARY BY ROLE:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} user(s)`);
    });

  } catch (error) {
    console.error('❌ Error checking user roles:', error);
  }
}

checkUserRoles();
