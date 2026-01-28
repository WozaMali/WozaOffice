const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllUsersNow() {
  console.log('🔍 CHECKING ALL USERS RIGHT NOW...\n');
  
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
        township_id,
        street_addr,
        subdivision,
        city,
        postal_code,
        created_at,
        roles!role_id(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`📊 Found ${users?.length || 0} total users:\n`);

    users?.forEach((user, index) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      const displayName = fullName || user.email || 'Unknown';
      const roleName = user.roles?.name || 'Unknown Role';
      const isResident = roleName === 'resident';
      const hasAddress = !!(user.street_addr && user.city);
      
      console.log(`${index + 1}. ${displayName}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   📱 Phone: ${user.phone || 'Not provided'}`);
      console.log(`   🎭 Role: ${roleName} ${isResident ? '✅' : '❌'}`);
      console.log(`   🏠 Has Address: ${hasAddress ? '✅' : '❌'}`);
      console.log(`   🆔 User ID: ${user.id}`);
      console.log(`   🆔 Role ID: ${user.role_id}`);
      console.log(`   📅 Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log(`   ${isResident ? '✅ WILL APPEAR' : '❌ WILL NOT APPEAR'} in collection form`);
      console.log('-'.repeat(80));
    });

    // Count by role
    const roleCounts = {};
    users?.forEach(user => {
      const roleName = user.roles?.name || 'Unknown';
      roleCounts[roleName] = (roleCounts[roleName] || 0) + 1;
    });

    console.log('\n📈 SUMMARY BY ROLE:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} user(s)`);
    });

    // Show resident role ID for reference
    const { data: residentRole, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', 'resident')
      .single();

    if (!roleError && residentRole) {
      console.log(`\n🎯 RESIDENT ROLE ID: ${residentRole.id}`);
      console.log('   Users with this role_id will appear in collection form');
    }

  } catch (error) {
    console.error('❌ Error checking users:', error);
  }
}

checkAllUsersNow();
