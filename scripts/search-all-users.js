const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchAllUsers() {
  console.log('🔍 SEARCHING ALL TABLES FOR USERS...\n');
  
  try {
    // 1. Search users table
    console.log('📋 1. USERS TABLE:');
    const { data: users, error: usersError } = await supabase
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

    if (usersError) {
      console.error('❌ Users table error:', usersError);
    } else {
      console.log(`✅ Found ${users?.length || 0} users in users table:`);
      users?.forEach((user, index) => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        const displayName = fullName || user.email || 'Unknown';
        console.log(`   ${index + 1}. ${displayName} (${user.email}) - Role: ${user.roles?.name || 'Unknown'} - ID: ${user.id}`);
      });
    }

    // 2. Search profiles table
    console.log('\n📋 2. PROFILES TABLE:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        user_id,
        full_name,
        email,
        phone,
        identity_number,
        employee_number,
        created_at,
        users!user_id(first_name, last_name, role_id, roles!role_id(name))
      `)
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Profiles table error:', profilesError);
    } else {
      console.log(`✅ Found ${profiles?.length || 0} profiles in profiles table:`);
      profiles?.forEach((profile, index) => {
        const user = profile.users;
        const roleName = user?.roles?.name || 'Unknown';
        console.log(`   ${index + 1}. ${profile.full_name || 'Unknown'} (${profile.email}) - Role: ${roleName} - Employee: ${profile.employee_number || 'N/A'} - ID: ${profile.id}`);
      });
    }

    // 3. Search roles table
    console.log('\n📋 3. ROLES TABLE:');
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (rolesError) {
      console.error('❌ Roles table error:', rolesError);
    } else {
      console.log(`✅ Found ${roles?.length || 0} roles:`);
      roles?.forEach((role, index) => {
        console.log(`   ${index + 1}. ${role.name} - ID: ${role.id}`);
      });
    }

    // 4. Search areas table
    console.log('\n📋 4. AREAS TABLE:');
    const { data: areas, error: areasError } = await supabase
      .from('areas')
      .select('*')
      .order('name');

    if (areasError) {
      console.error('❌ Areas table error:', areasError);
    } else {
      console.log(`✅ Found ${areas?.length || 0} areas:`);
      areas?.forEach((area, index) => {
        console.log(`   ${index + 1}. ${area.name} - ID: ${area.id}`);
      });
    }

    // 5. Search user_addresses table
    console.log('\n📋 5. USER_ADDRESSES TABLE:');
    const { data: addresses, error: addressesError } = await supabase
      .from('user_addresses')
      .select(`
        id,
        user_id,
        address_line1,
        address_line2,
        city,
        province,
        postal_code,
        is_primary,
        created_at,
        users!user_id(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    if (addressesError) {
      console.error('❌ User addresses table error:', addressesError);
    } else {
      console.log(`✅ Found ${addresses?.length || 0} user addresses:`);
      addresses?.forEach((address, index) => {
        const user = address.users;
        const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Unknown';
        console.log(`   ${index + 1}. ${userName} - ${address.address_line1}, ${address.city} - Primary: ${address.is_primary} - ID: ${address.id}`);
      });
    }

    // 6. Search collections table
    console.log('\n📋 6. COLLECTIONS TABLE:');
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select(`
        id,
        resident_id,
        collector_id,
        area_id,
        material_id,
        weight_kg,
        estimated_value,
        status,
        created_at,
        users!collections_resident_id_fkey(first_name, last_name, email),
        users!collections_collector_id_fkey(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    if (collectionsError) {
      console.error('❌ Collections table error:', collectionsError);
    } else {
      console.log(`✅ Found ${collections?.length || 0} collections:`);
      collections?.forEach((collection, index) => {
        const resident = collection.users;
        const collector = collection.users;
        const residentName = resident ? `${resident.first_name || ''} ${resident.last_name || ''}`.trim() || resident.email : 'Unknown';
        const collectorName = collector ? `${collector.first_name || ''} ${collector.last_name || ''}`.trim() || collector.email : 'Unknown';
        console.log(`   ${index + 1}. Resident: ${residentName} | Collector: ${collectorName} | Weight: ${collection.weight_kg}kg | Status: ${collection.status} - ID: ${collection.id}`);
      });
    }

    // 7. Search materials table
    console.log('\n📋 7. MATERIALS TABLE:');
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('*')
      .order('name');

    if (materialsError) {
      console.error('❌ Materials table error:', materialsError);
    } else {
      console.log(`✅ Found ${materials?.length || 0} materials:`);
      materials?.forEach((material, index) => {
        console.log(`   ${index + 1}. ${material.name} - R${material.unit_price}/kg - ID: ${material.id}`);
      });
    }

    // 8. Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   • Users: ${users?.length || 0}`);
    console.log(`   • Profiles: ${profiles?.length || 0}`);
    console.log(`   • Roles: ${roles?.length || 0}`);
    console.log(`   • Areas: ${areas?.length || 0}`);
    console.log(`   • User Addresses: ${addresses?.length || 0}`);
    console.log(`   • Collections: ${collections?.length || 0}`);
    console.log(`   • Materials: ${materials?.length || 0}`);

  } catch (error) {
    console.error('❌ Error searching all tables:', error);
  }
}

searchAllUsers();
