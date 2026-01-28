import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCollectionsTable() {
  try {
    console.log('🔍 Checking collections table structure...');
    
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ Collections table accessible');
      if (data && data.length > 0) {
        console.log('📋 Available columns:', Object.keys(data[0]));
        console.log('📄 Sample data:', data[0]);
      } else {
        console.log('📭 No collections found, but table exists');
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

checkCollectionsTable();
