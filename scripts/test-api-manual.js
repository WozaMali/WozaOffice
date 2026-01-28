/**
 * Manual test of the PET contribution API
 * This will help us see exactly what's happening
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = 'https://mljtjntkddwkcjixkyuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanRqbnRrZGR3a2NqaXhreXV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQyNjY4NSwiZXhwIjoyMDcwMDAyNjg1fQ.X6O2YFRkkN0T_yB-XgGYi2_PY9ob0ZOmHE0FJUl9T7A';

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function testAPI() {
  console.log('🧪 Testing PET Contribution API manually...\n');

  try {
    // 1. First, let's see what's in the database
    console.log('1. Checking current state...');
    const { data: currentTransactions, error: currentError } = await supabase
      .from('green_scholar_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (currentError) {
      console.log('❌ Error:', currentError.message);
      return;
    }

    console.log(`📊 Current transactions: ${currentTransactions.length}`);
    currentTransactions.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.transaction_type} - R${t.amount} - ${t.description}`);
    });

    // 2. Find a collection with PET materials
    console.log('\n2. Looking for collections with PET materials...');
    const { data: collections, error: collError } = await supabase
      .from('unified_collections')
      .select('id, status, created_at')
      .in('status', ['approved', 'completed'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (collError) {
      console.log('❌ Error querying collections:', collError.message);
      return;
    }

    let testCollectionId = null;
    for (const collection of collections) {
      const { data: materials, error: matError } = await supabase
        .from('collection_materials')
        .select('quantity, materials(name)')
        .eq('collection_id', collection.id);

      if (!matError && materials) {
        const petMaterials = materials.filter(m => 
          (m.materials?.name || '').toLowerCase().includes('pet')
        );
        if (petMaterials.length > 0) {
          const totalKg = petMaterials.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
          console.log(`   ✅ Found collection ${collection.id} with ${petMaterials.length} PET materials, ${totalKg}kg`);
          testCollectionId = collection.id;
          break;
        }
      }
    }

    if (!testCollectionId) {
      console.log('   ❌ No collections with PET materials found');
      return;
    }

    // 3. Test the API endpoint
    console.log(`\n3. Testing API with collection ${testCollectionId}...`);
    
    // Simulate the API call by running the same logic
    const { data: rows, error: qErr } = await supabase
      .from('collection_materials')
      .select('quantity, materials(name)')
      .eq('collection_id', testCollectionId);

    if (qErr) {
      console.log('❌ Error querying materials:', qErr.message);
      return;
    }

    console.log(`   📋 Found ${rows.length} materials for collection ${testCollectionId}`);
    rows.forEach((r, i) => {
      console.log(`     ${i + 1}. ${r.materials?.name} - ${r.quantity}kg`);
    });

    // Filter PET materials
    const items = (rows || []).filter((r) => (r.materials?.name || '').toLowerCase().includes('pet'));
    const totalKg = items.reduce((s, r) => s + Number(r.quantity || 0), 0);
    const petRate = 1.5;
    const petTotal = Number((totalKg * petRate).toFixed(2));

    console.log(`   🧮 PET calculation: ${items.length} PET items, ${totalKg}kg total, R${petTotal} contribution`);

    if (petTotal <= 0) {
      console.log('   ❌ No PET contribution to make');
      return;
    }

    // Check for existing contribution
    const { data: existing, error: existErr } = await supabase
      .from('green_scholar_transactions')
      .select('id')
      .eq('source_type', 'collection')
      .eq('source_id', testCollectionId)
      .in('transaction_type', ['pet_contribution'])
      .limit(1);

    if (existErr) {
      console.log('❌ Error checking existing:', existErr.message);
      return;
    }

    if (existing && existing.length > 0) {
      console.log('   ℹ️  PET contribution already exists for this collection');
      return;
    }

    // Insert the contribution
    console.log('   💾 Inserting PET contribution...');
    const { error: insErr } = await supabase
      .from('green_scholar_transactions')
      .insert({
        transaction_type: 'pet_contribution',
        amount: petTotal,
        source_type: 'collection',
        source_id: testCollectionId,
        description: `PET contribution from collection ${testCollectionId} @ R${petRate.toFixed(2)}/kg`
      });

    if (insErr) {
      console.log('❌ Error inserting transaction:', insErr.message);
      return;
    }

    console.log('   ✅ PET contribution inserted successfully!');

    // 4. Verify the insertion
    console.log('\n4. Verifying insertion...');
    const { data: newTransactions, error: newError } = await supabase
      .from('green_scholar_transactions')
      .select('*')
      .eq('source_id', testCollectionId)
      .eq('transaction_type', 'pet_contribution')
      .order('created_at', { ascending: false });

    if (newError) {
      console.log('❌ Error verifying:', newError.message);
    } else {
      console.log(`   ✅ Found ${newTransactions.length} PET contributions for this collection`);
      newTransactions.forEach((t, i) => {
        console.log(`     ${i + 1}. R${t.amount} - ${t.description} - ${t.created_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the test
testAPI().catch(console.error);
