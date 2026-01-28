const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableStructure() {
  try {
    console.log('🔍 Checking unified_collections table structure...');
    
    // Get a sample record to see the actual structure
    const { data, error } = await supabase
      .from('unified_collections')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error fetching data:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Sample record structure:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️ No records found in unified_collections table');
    }
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

checkTableStructure();
