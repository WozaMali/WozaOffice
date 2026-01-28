const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function addTestResidentsSimple() {
  console.log('🔍 ADDING TEST RESIDENTS (SIMPLE)...\n');
  
  try {
    // Get the resident role ID
    const { data: residentRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'resident')
      .single();

    if (roleError) {
      console.error('❌ Error getting resident role:', roleError);
      return;
    }

    console.log(`✅ Resident role ID: ${residentRole.id}`);

    // Get a township ID
    const { data: township, error: townshipError } = await supabase
      .from('areas')
      .select('id')
      .eq('name', 'Orlando East')
      .single();

    if (townshipError) {
      console.error('❌ Error getting township:', townshipError);
      return;
    }

    console.log(`✅ Township ID: ${township.id}`);

    // Test residents to add with generated UUIDs
    const testResidents = [
      {
        id: generateUUID(),
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '0821234567',
        role_id: residentRole.id,
        township_id: township.id,
        street_addr: '123 Main Street',
        subdivision: 'Orlando East',
        city: 'Soweto',
        postal_code: '1804'
      },
      {
        id: generateUUID(),
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        phone: '0831234567',
        role_id: residentRole.id,
        township_id: township.id,
        street_addr: '456 Oak Avenue',
        subdivision: 'Orlando East',
        city: 'Soweto',
        postal_code: '1804'
      },
      {
        id: generateUUID(),
        first_name: 'Mike',
        last_name: 'Johnson',
        email: 'mike.johnson@example.com',
        phone: '0841234567',
        role_id: residentRole.id,
        township_id: township.id,
        // No address - to test users without addresses
        city: 'Soweto'
      },
      {
        id: generateUUID(),
        first_name: 'Sarah',
        last_name: 'Williams',
        email: 'sarah.williams@example.com',
        phone: '0851234567',
        role_id: residentRole.id,
        township_id: township.id,
        street_addr: '789 Pine Road',
        subdivision: 'Orlando East',
        city: 'Soweto',
        postal_code: '1804'
      }
    ];

    console.log(`\n📝 Adding ${testResidents.length} test residents...\n`);

    for (let i = 0; i < testResidents.length; i++) {
      const resident = testResidents[i];
      console.log(`Adding ${i + 1}. ${resident.first_name} ${resident.last_name}...`);
      
      const { data, error } = await supabase
        .from('users')
        .insert([resident])
        .select()
        .single();

      if (error) {
        console.error(`❌ Error adding ${resident.first_name}:`, error);
      } else {
        console.log(`✅ Added ${resident.first_name} ${resident.last_name} - ID: ${data.id}`);
      }
    }

    // Check final count
    console.log('\n🔍 Checking final resident count...');
    const { data: finalUsers, error: finalError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        role_id,
        street_addr,
        subdivision,
        city,
        postal_code,
        roles!role_id(name)
      `)
      .eq('role_id', residentRole.id)
      .order('first_name');

    if (finalError) {
      console.error('❌ Error checking final count:', finalError);
    } else {
      console.log(`\n📊 Final resident count: ${finalUsers?.length || 0}`);
      finalUsers?.forEach((user, index) => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        const hasAddress = !!(user.street_addr && user.city);
        console.log(`   ${index + 1}. ${fullName} (${user.email}) - Address: ${hasAddress ? '✅' : '❌'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addTestResidentsSimple();
