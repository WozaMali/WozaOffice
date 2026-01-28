const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testResidents() {
  console.log('🔍 TESTING RESIDENT FETCHING...\n');
  
  try {
    // Test 1: Direct query like ResidentService
    console.log('📋 1. Direct users query (like ResidentService):');
    const { data: residentRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'resident')
      .single();

    if (roleError) {
      console.error('❌ Role error:', roleError);
      return;
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        email,
        township_id,
        created_at,
        street_addr,
        subdivision,
        city,
        postal_code,
        areas!township_id(name)
      `)
      .eq('role_id', residentRole.id)
      .order('first_name');

    if (usersError) {
      console.error('❌ Users error:', usersError);
      return;
    }

    console.log(`✅ Found ${users?.length || 0} residents:`);
    users?.forEach((user, index) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      const displayName = fullName || user.email || 'Unknown';
      const hasAddress = !!(user.street_addr && user.city);
      const address = hasAddress ? 
        `${user.street_addr}${user.subdivision ? ', ' + user.subdivision : ''}, ${user.areas?.[0]?.name || 'Unknown Township'}, ${user.city}${user.postal_code ? ' ' + user.postal_code : ''}`.replace(/,\s*,/g, ',').trim() : 
        'No address provided';
      
      console.log(`   ${index + 1}. ${displayName} (${user.email})`);
      console.log(`      📱 Phone: ${user.phone || 'Not provided'}`);
      console.log(`      🏠 Address: ${address}`);
      console.log(`      📍 Has Address: ${hasAddress ? '✅' : '❌'}`);
      console.log(`      🆔 ID: ${user.id}`);
      console.log('');
    });

    // Test 2: UnifiedCollectorService
    console.log('📋 2. UnifiedCollectorService test:');
    const { UnifiedCollectorService } = await import('./collector-app/src/lib/unified-collector-service');
    const { data: unifiedResidents, error: unifiedError } = await UnifiedCollectorService.getAllResidents();
    
    if (unifiedError) {
      console.error('❌ UnifiedCollectorService error:', unifiedError);
    } else {
      console.log(`✅ UnifiedCollectorService found ${unifiedResidents?.length || 0} residents:`);
      unifiedResidents?.forEach((resident, index) => {
        console.log(`   ${index + 1}. ${resident.name} (${resident.email})`);
        console.log(`      📱 Phone: ${resident.phone || 'Not provided'}`);
        console.log(`      🏠 Address: ${resident.address}`);
        console.log(`      📍 Has Address: ${resident.hasAddress ? '✅' : '❌'}`);
        console.log(`      🆔 ID: ${resident.id}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testResidents();
