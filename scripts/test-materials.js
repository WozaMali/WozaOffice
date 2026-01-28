const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testMaterials() {
  console.log('🧪 Testing materials table...');
  console.log('🔌 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('✅ Materials table working!');
    console.log('📊 Found', data.length, 'materials:');
    data.forEach(m => {
      console.log('  -', m.name, ':', m.unit_price, 'per kg');
    });
    
    // Test Green Scholar Fund materials
    const petBottles = data.find(m => m.name === 'PET Bottles');
    if (petBottles) {
      console.log('🌱 PET Bottles found:', petBottles.unit_price, 'per kg (Green Scholar Fund)');
    }
    
    // Test Aluminium Cans
    const aluminiumCans = data.find(m => m.name === 'Aluminium Cans');
    if (aluminiumCans) {
      console.log('🥤 Aluminium Cans found:', aluminiumCans.unit_price, 'per kg');
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testMaterials();
