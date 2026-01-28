const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testCompleteSystem() {
  console.log('🧪 Testing Complete Collections System...');
  console.log('🔌 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  try {
    // 1. Test materials table
    console.log('\n📊 1. Testing materials table...');
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('*')
      .order('name');
    
    if (materialsError) {
      console.error('❌ Materials error:', materialsError);
    } else {
      console.log('✅ Materials table working!');
      console.log('📊 Found', materials.length, 'materials');
      materials.forEach(m => {
        console.log('  -', m.name, ':', m.unit_price, 'per kg');
      });
    }
    
    // 2. Test collections table
    console.log('\n📦 2. Testing collections table...');
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .limit(1);
    
    if (collectionsError) {
      console.error('❌ Collections error:', collectionsError);
    } else {
      console.log('✅ Collections table working!');
      console.log('📊 Found', collections.length, 'collections');
    }
    
    // 3. Test views
    console.log('\n👁️ 3. Testing views...');
    
    // Test collection_details view
    const { data: collectionDetails, error: detailsError } = await supabase
      .from('collection_details')
      .select('*')
      .limit(1);
    
    if (detailsError) {
      console.error('❌ Collection details view error:', detailsError);
    } else {
      console.log('✅ Collection details view working!');
    }
    
    // Test collector_stats view
    const { data: collectorStats, error: statsError } = await supabase
      .from('collector_stats')
      .select('*')
      .limit(1);
    
    if (statsError) {
      console.error('❌ Collector stats view error:', statsError);
    } else {
      console.log('✅ Collector stats view working!');
    }
    
    // Test green_scholar_fund_summary view
    const { data: fundSummary, error: fundError } = await supabase
      .from('green_scholar_fund_summary')
      .select('*')
      .limit(1);
    
    if (fundError) {
      console.error('❌ Green Scholar Fund summary view error:', fundError);
    } else {
      console.log('✅ Green Scholar Fund summary view working!');
    }
    
    // 4. Test roles table
    console.log('\n👥 4. Testing roles table...');
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*');
    
    if (rolesError) {
      console.error('❌ Roles error:', rolesError);
    } else {
      console.log('✅ Roles table working!');
      console.log('📊 Found', roles.length, 'roles');
      roles.forEach(r => {
        console.log('  -', r.name, ':', r.description);
      });
    }
    
    // 5. Test users table
    console.log('\n👤 5. Testing users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, role_id')
      .limit(3);
    
    if (usersError) {
      console.error('❌ Users error:', usersError);
    } else {
      console.log('✅ Users table working!');
      console.log('📊 Found', users.length, 'users');
    }
    
    // 6. Test areas table
    console.log('\n🏘️ 6. Testing areas table...');
    const { data: areas, error: areasError } = await supabase
      .from('areas')
      .select('*')
      .limit(3);
    
    if (areasError) {
      console.error('❌ Areas error:', areasError);
    } else {
      console.log('✅ Areas table working!');
      console.log('📊 Found', areas.length, 'areas');
    }
    
    console.log('\n🎉 Complete system test finished!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCompleteSystem();
