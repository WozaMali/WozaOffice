const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function showSupabaseGuide() {
  console.log('🔍 SUPABASE USER CHECK GUIDE\n');
  console.log('📋 To check users in Supabase Dashboard:');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to "Table Editor" in the left sidebar');
  console.log('4. Click on the "users" table');
  console.log('5. Look for users with role_id that matches "resident" role\n');
  
  try {
    // Get the resident role ID
    const { data: residentRole, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', 'resident')
      .single();

    if (roleError) {
      console.error('❌ Error getting resident role:', roleError);
      return;
    }

    console.log(`🎯 RESIDENT ROLE ID: ${residentRole.id}`);
    console.log('   Look for users with this role_id in the users table\n');

    // Get all users
    const { data: users, error: usersError } = await supabase
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

    if (usersError) {
      console.error('❌ Error getting users:', usersError);
      return;
    }

    console.log('👥 ALL USERS IN DATABASE:');
    console.log('=' .repeat(80));
    
    users?.forEach((user, index) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      const displayName = fullName || user.email || 'Unknown';
      const roleName = user.roles?.name || 'Unknown Role';
      const isResident = roleName === 'resident';
      
      console.log(`${index + 1}. ${displayName}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   📱 Phone: ${user.phone || 'Not provided'}`);
      console.log(`   🎭 Role: ${roleName} ${isResident ? '✅' : '❌'}`);
      console.log(`   🆔 User ID: ${user.id}`);
      console.log(`   🆔 Role ID: ${user.role_id}`);
      console.log(`   📅 Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log(`   ${isResident ? '✅ WILL APPEAR' : '❌ WILL NOT APPEAR'} in customer page`);
      console.log('-'.repeat(80));
    });

    // Count residents
    const residents = users?.filter(user => user.roles?.name === 'resident') || [];
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total users: ${users?.length || 0}`);
    console.log(`   Residents: ${residents.length} (will appear in customer page)`);
    console.log(`   Non-residents: ${(users?.length || 0) - residents.length} (will NOT appear in customer page)`);

    if (residents.length === 0) {
      console.log('\n⚠️  NO RESIDENTS FOUND!');
      console.log('   To add residents to the customer page:');
      console.log('   1. Go to Supabase Dashboard > Table Editor > users');
      console.log('   2. Click "Insert" > "Insert row"');
      console.log('   3. Fill in the form with:');
      console.log('      - first_name: "John"');
      console.log('      - last_name: "Doe"');
      console.log('      - email: "john@example.com"');
      console.log('      - phone: "0821234567"');
      console.log('      - role_id: "' + residentRole.id + '"');
      console.log('      - township_id: (select any area ID)');
      console.log('   4. Click "Save"');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

showSupabaseGuide();
