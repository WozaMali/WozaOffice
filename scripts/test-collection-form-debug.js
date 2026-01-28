const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugCollectionForm() {
  console.log('🔍 Debugging Collection Form Data Loading...');
  
  try {
    // 1. Test materials table
    console.log('\n📦 1. Testing materials table...');
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('*')
      .limit(5);
    
    if (materialsError) {
      console.error('❌ Materials error:', materialsError);
    } else {
      console.log('✅ Materials accessible:', materials.length, 'materials');
      console.log('Sample materials:', materials.map(m => ({ name: m.name, is_active: m.is_active })));
    }
    
    // 2. Test roles table
    console.log('\n👤 2. Testing roles table...');
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*');
    
    if (rolesError) {
      console.error('❌ Roles error:', rolesError);
    } else {
      console.log('✅ Roles accessible:', roles.length, 'roles');
      console.log('Available roles:', roles.map(r => r.name));
    }
    
    // 3. Test users table structure
    console.log('\n👥 3. Testing users table structure...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role_id, is_active')
      .limit(3);
    
    if (usersError) {
      console.error('❌ Users error:', usersError);
    } else {
      console.log('✅ Users accessible:', users.length, 'users');
      console.log('Sample users:', users.map(u => ({ 
        name: `${u.first_name} ${u.last_name}`, 
        email: u.email, 
        role_id: u.role_id,
        is_active: u.is_active 
      })));
    }
    
    // 4. Test areas table
    console.log('\n🏘️ 4. Testing areas table...');
    const { data: areas, error: areasError } = await supabase
      .from('areas')
      .select('*')
      .limit(3);
    
    if (areasError) {
      console.error('❌ Areas error:', areasError);
    } else {
      console.log('✅ Areas accessible:', areas.length, 'areas');
      console.log('Sample areas:', areas.map(a => ({ name: a.name, city: a.city, is_active: a.is_active })));
    }
    
    // 5. Test specific queries that might be failing
    console.log('\n🔍 5. Testing specific queries...');
    
    // Test materials with is_active filter
    const { data: activeMaterials, error: activeMaterialsError } = await supabase
      .from('materials')
      .select('*')
      .eq('is_active', true);
    
    if (activeMaterialsError) {
      console.error('❌ Active materials error:', activeMaterialsError);
    } else {
      console.log('✅ Active materials:', activeMaterials.length);
    }
    
    // Test areas with is_active filter
    const { data: activeAreas, error: activeAreasError } = await supabase
      .from('areas')
      .select('*')
      .eq('is_active', true);
    
    if (activeAreasError) {
      console.error('❌ Active areas error:', activeAreasError);
    } else {
      console.log('✅ Active areas:', activeAreas.length);
    }
    
    // Test users with role filter
    const residentRole = roles?.find(r => r.name === 'resident');
    if (residentRole) {
      const { data: residents, error: residentsError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('role_id', residentRole.id)
        .eq('is_active', true);
      
      if (residentsError) {
        console.error('❌ Residents error:', residentsError);
      } else {
        console.log('✅ Residents with role filter:', residents.length);
      }
    }
    
    console.log('\n🎉 Debug complete!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugCollectionForm();
