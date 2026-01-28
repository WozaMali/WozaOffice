/**
 * Test the PET contribution API after RLS fix
 * This script tests the API endpoint directly
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = 'https://mljtjntkddwkcjixkyuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanRqbnRrZGR3a2NqaXhreXV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQyNjY4NSwiZXhwIjoyMDcwMDAyNjg1fQ.X6O2YFRkkN0T_yB-XgGYi2_PY9ob0ZOmHE0FJUl9T7A';

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function testPetAPI() {
  console.log('🧪 Testing PET Contribution API (Post-RLS Fix)...\n');

  try {
    // 1. Test database access first
    console.log('1. Testing database access...');
    const { data: testData, error: testError } = await supabase
      .from('green_scholar_transactions')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('❌ Database access error:', testError.message);
      console.log('   Please run the RLS fix SQL script first!');
      return;
    }

    console.log('✅ Database access working');

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
      console.log('   Creating a test collection...');
      
      // Create a test collection with PET materials
      const { data: testCollection, error: createError } = await supabase
        .from('unified_collections')
        .insert({
          status: 'approved',
          total_weight_kg: 5.0,
          computed_value: 7.5,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createError) {
        console.log('❌ Error creating test collection:', createError.message);
        return;
      }

      testCollectionId = testCollection.id;
      console.log(`   ✅ Created test collection: ${testCollectionId}`);

      // Add PET materials to the test collection
      const { data: petMaterial, error: matError } = await supabase
        .from('materials')
        .select('id')
        .ilike('name', '%pet%')
        .limit(1)
        .single();

      if (!matError && petMaterial) {
        await supabase
          .from('collection_materials')
          .insert({
            collection_id: testCollectionId,
            material_id: petMaterial.id,
            quantity: 5.0,
            unit_price: 1.5
          });
        console.log('   ✅ Added PET materials to test collection');
      }
    }

    // 3. Test the API endpoint
    console.log(`\n3. Testing API with collection ${testCollectionId}...`);
    
    try {
      const response = await fetch('http://localhost:8081/api/green-scholar/pet-bottles-contribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId: testCollectionId })
      });
      
      const result = await response.json();
      console.log(`   📊 API Response: ${response.status}`);
      console.log(`   📋 Result:`, JSON.stringify(result, null, 2));
      
      if (result.created) {
        console.log('   ✅ API successfully created PET contribution!');
      } else if (result.amount > 0) {
        console.log('   ℹ️  PET contribution already exists for this collection');
      } else {
        console.log('   ℹ️  No PET materials found in collection');
      }
    } catch (apiError) {
      console.log(`   ❌ API Error: ${apiError.message}`);
    }

    // 4. Verify the transaction was created
    console.log('\n4. Verifying transaction creation...');
    const { data: transactions, error: transError } = await supabase
      .from('green_scholar_transactions')
      .select('*')
      .eq('source_id', testCollectionId)
      .eq('transaction_type', 'pet_contribution')
      .order('created_at', { ascending: false });

    if (transError) {
      console.log('❌ Error verifying transactions:', transError.message);
    } else {
      console.log(`   📊 Found ${transactions.length} PET contributions for collection ${testCollectionId}`);
      transactions.forEach((t, i) => {
        console.log(`     ${i + 1}. R${t.amount} - ${t.description} - ${t.created_at}`);
      });
    }

    // 5. Test the Green Scholar Fund service
    console.log('\n5. Testing Green Scholar Fund service...');
    const { data: allTransactions, error: allError } = await supabase
      .from('green_scholar_transactions')
      .select('amount, transaction_type');

    if (allError) {
      console.log('❌ Error querying all transactions:', allError.message);
    } else {
      const sum = (arr, key) => arr.filter(r => r.transaction_type === key).reduce((s, r) => s + Number(r.amount || 0), 0);
      const petContrib = sum(allTransactions, 'pet_contribution');
      const petDonation = sum(allTransactions, 'pet_donation');
      const totalPet = petContrib || petDonation || 0;
      
      console.log(`   📊 Total PET contributions: R${totalPet}`);
      console.log(`   📊 pet_contribution: R${petContrib}`);
      console.log(`   📊 pet_donation: R${petDonation}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the test
testPetAPI().catch(console.error);
