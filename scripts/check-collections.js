const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCollections() {
  console.log('🔍 CHECKING COLLECTIONS TABLE...\n');
  
  try {
    // Check collections table
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (collectionsError) {
      console.error('❌ Collections table error:', collectionsError);
    } else {
      console.log(`✅ Found ${collections?.length || 0} collections:`);
      collections?.forEach((collection, index) => {
        console.log(`   ${index + 1}. ID: ${collection.id} | Resident: ${collection.resident_id} | Collector: ${collection.collector_id} | Weight: ${collection.weight_kg}kg | Status: ${collection.status}`);
      });
    }

    // Check collection_details view
    console.log('\n🔍 CHECKING COLLECTION_DETAILS VIEW...\n');
    const { data: collectionDetails, error: detailsError } = await supabase
      .from('collection_details')
      .select('*')
      .order('created_at', { ascending: false });

    if (detailsError) {
      console.error('❌ Collection details view error:', detailsError);
    } else {
      console.log(`✅ Found ${collectionDetails?.length || 0} collection details:`);
      collectionDetails?.forEach((detail, index) => {
        console.log(`   ${index + 1}. ${detail.resident_name} | ${detail.collector_name} | ${detail.material_name} | ${detail.weight_kg}kg | ${detail.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking collections:', error);
  }
}

checkCollections();
