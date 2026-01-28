import { supabase } from './supabase';

export interface CollectionMaterial {
  material_id: string;
  kilograms: number;
  contamination_pct: number;
  notes?: string;
}

export interface LiveCollectionData {
  customer_id: string;
  address_id?: string;
  materials: CollectionMaterial[];
  notes?: string;
  scale_photo?: string;
  recyclables_photo?: string;
  lat?: number;
  lng?: number;
}

export interface CollectionResult {
  pickup_id: string;
  total_kg: number;
  total_value: number;
  environmental_impact: {
    co2_saved: number;
    water_saved: number;
    landfill_saved: number;
    trees_equivalent: number;
  };
  points_earned: number;
  fund_allocation: {
    green_scholar_fund: number;
    user_wallet: number;
  };
}

/**
 * Submit a live collection to the database
 * This creates a pickup record, pickup items, and updates customer metrics
 */
export async function submitLiveCollection(
  collectionData: LiveCollectionData,
  collector_id: string
): Promise<CollectionResult> {
  const startTime = Date.now();
  const TIMEOUT_MS = 45000; // 45 seconds timeout
  
  try {
    console.log('🚀 Starting live collection submission...', collectionData);
    
    // Set up timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Save operation timed out. Please try again.'));
      }, TIMEOUT_MS);
    });

    // Step 1: Create the pickup record
    const { data: pickup, error: pickupError } = await supabase
      .from('pickups')
      .insert({
        customer_id: collectionData.customer_id,
        collector_id: collector_id,
        address_id: collectionData.address_id,
        status: 'submitted',
        started_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        lat: collectionData.lat,
        lng: collectionData.lng,
        total_kg: 0, // Will be calculated by trigger
        total_value: 0 // Will be calculated by trigger
      })
      .select()
      .single();

    if (pickupError) {
      console.error('❌ Error creating pickup:', pickupError);
      throw new Error(`Failed to create pickup: ${pickupError.message}`);
    }

    console.log('✅ Pickup created:', pickup.id);

    // Step 2: Create pickup items for all materials in batch
    const pickupItemsData = collectionData.materials.map(material => ({
      pickup_id: pickup.id,
      material_id: material.material_id,
      kilograms: material.kilograms,
      contamination_pct: material.contamination_pct,
      notes: material.notes
    }));

    console.log('🚀 Creating pickup items in batch...', pickupItemsData);
    const { data: pickupItems, error: itemsError } = await supabase
      .from('pickup_items')
      .insert(pickupItemsData)
      .select();

    if (itemsError) {
      console.error('❌ Error creating pickup items:', itemsError);
      throw new Error(`Failed to create pickup items: ${itemsError.message}`);
    }

    console.log('✅ Pickup items created:', pickupItems.length);

    // Step 3: Add photos if provided
    if (collectionData.scale_photo || collectionData.recyclables_photo) {
      const photos = [];
      
      if (collectionData.scale_photo) {
        photos.push({
          pickup_id: pickup.id,
          photo_url: collectionData.scale_photo,
          photo_type: 'scale',
          description: 'Scale photo from live collection'
        });
      }
      
      if (collectionData.recyclables_photo) {
        photos.push({
          pickup_id: pickup.id,
          photo_url: collectionData.recyclables_photo,
          photo_type: 'recyclables',
          description: 'Recyclables photo from live collection'
        });
      }

      if (photos.length > 0) {
        const { error: photoError } = await supabase
          .from('pickup_photos')
          .insert(photos);

        if (photoError) {
          console.error('⚠️ Warning: Failed to save photos:', photoError);
          // Don't fail the entire collection for photo errors
        } else {
          console.log(`✅ ${photos.length} photos saved`);
        }
      }
    }

    // Step 4: Get the updated pickup with calculated totals
    const { data: updatedPickup, error: fetchError } = await supabase
      .from('pickups')
      .select('*')
      .eq('id', pickup.id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching updated pickup:', fetchError);
      throw new Error(`Failed to fetch updated pickup: ${fetchError.message}`);
    }

    // Step 5: Calculate environmental impact and points
    const environmentalImpact = await calculateCollectionImpact(collectionData.materials);
    const pointsEarned = await calculateCollectionPoints(collectionData.materials);
    const fundAllocation = await calculateFundAllocation(collectionData.materials, updatedPickup.total_value);

    // Step 6: Update wallet ledger for the customer
    await updateCustomerWallet(
      collectionData.customer_id,
      pickup.id,
      pointsEarned,
      fundAllocation.user_wallet,
      `Collection of ${updatedPickup.total_kg}kg - ${pointsEarned} points earned`
    );

    const result: CollectionResult = {
      pickup_id: pickup.id,
      total_kg: updatedPickup.total_kg,
      total_value: updatedPickup.total_value,
      environmental_impact: environmentalImpact,
      points_earned: pointsEarned,
      fund_allocation: fundAllocation
    };

    const endTime = Date.now();
    console.log(`⏱️ Live collection submitted successfully in ${endTime - startTime}ms!`, result);
    return result;

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('❌ Error in submitLiveCollection:', error);
    console.error(`⏱️ Operation failed after ${duration}ms`);
    
    if (error instanceof Error) {
      // Check if it's a timeout error
      if (error.message.includes('timed out') || duration >= TIMEOUT_MS) {
        throw new Error('Save operation timed out. Please check your internet connection and try again.');
      }
      
      // Check if it's a network error
      if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new Error('Network error occurred. Please check your internet connection and try again.');
      }
    }
    
    throw error;
  }
}

/**
 * Calculate environmental impact for a collection
 */
async function calculateCollectionImpact(materials: CollectionMaterial[]) {
  let totalCo2Saved = 0;
  let totalWaterSaved = 0;
  let totalLandfillSaved = 0;

  for (const material of materials) {
    const { data: materialData, error } = await supabase
      .from('materials')
      .select('co2_per_kg, water_l_per_kg, landfill_l_per_kg')
      .eq('id', material.material_id)
      .single();

    if (!error && materialData) {
      totalCo2Saved += (materialData.co2_per_kg || 0) * material.kilograms;
      totalWaterSaved += (materialData.water_l_per_kg || 0) * material.kilograms;
      totalLandfillSaved += (materialData.landfill_l_per_kg || 0) * material.kilograms;
    }
  }

  return {
    co2_saved: Math.round(totalCo2Saved * 100) / 100,
    water_saved: Math.round(totalWaterSaved * 100) / 100,
    landfill_saved: Math.round(totalLandfillSaved * 100) / 100,
    trees_equivalent: Math.round((totalCo2Saved / 22.0) * 100) / 100 // 22kg CO2 = 1 tree
  };
}

/**
 * Calculate points earned for a collection
 */
async function calculateCollectionPoints(materials: CollectionMaterial[]) {
  let totalPoints = 0;

  for (const material of materials) {
    const { data: materialData, error } = await supabase
      .from('materials')
      .select('rate_per_kg, points_per_rand')
      .eq('id', material.material_id)
      .single();

    if (!error && materialData) {
      const materialValue = material.kilograms * (materialData.rate_per_kg || 0);
      const pointsForMaterial = materialValue * (materialData.points_per_rand || 1);
      totalPoints += pointsForMaterial;
    }
  }

  return Math.round(totalPoints);
}

/**
 * Calculate fund allocation based on material types
 * Aluminum: 100% to customer wallet
 * PET/Plastic: 100% to Green Scholar Fund
 * Other materials: 70% Green Scholar, 30% Customer Wallet
 */
async function calculateFundAllocation(materials: CollectionMaterial[], totalValue: number) {
  let aluminiumValue = 0;
  let petValue = 0;
  let otherValue = 0;

  // Calculate values by material type
  for (const material of materials) {
    const { data: materialData, error } = await supabase
      .from('materials')
      .select('name, rate_per_kg')
      .eq('id', material.material_id)
      .single();

    if (!error && materialData) {
      const materialValue = material.kilograms * materialData.rate_per_kg;
      const matName = String(materialData.name || '').trim();
      const isAluminum = matName === 'Aluminum Cans' || matName === 'Aluminium Cans';
      const isPet = matName === 'PET' || matName === 'PET Bottles' || matName === 'Plastic Bottles (PET)';
      if (isAluminum) {
        aluminiumValue += materialValue;
      } else if (isPet) {
        petValue += materialValue;
      } else {
        otherValue += materialValue;
      }
    }
  }

  // Calculate allocations
  const greenScholarFund = petValue + (otherValue * 0.7);
  const userWallet = aluminiumValue + (otherValue * 0.3);

  return {
    green_scholar_fund: Math.round(greenScholarFund * 100) / 100,
    user_wallet: Math.round(userWallet * 100) / 100,
    breakdown: {
      aluminium_customer: aluminiumValue,
      pet_green_scholar: petValue,
      other_green_scholar: otherValue * 0.7,
      other_customer: otherValue * 0.3
    }
  };
}

/**
 * Update customer wallet with points and credits
 */
async function updateCustomerWallet(
  customer_id: string,
  pickup_id: string,
  points: number,
  zar_amount: number,
  description: string
) {
  try {
    const { error } = await supabase
      .from('wallet_ledger')
      .insert({
        user_id: customer_id,
        pickup_id: pickup_id,
        points: points,
        zar_amount: zar_amount,
        fund_allocation: 0, // This is the Green Scholar portion
        description: description
      });

    if (error) {
      console.error('⚠️ Warning: Failed to update wallet:', error);
      // Don't fail the entire collection for wallet errors
    } else {
      console.log(`✅ Wallet updated: ${points} points, C${zar_amount} credits`);
    }
  } catch (error) {
    console.error('⚠️ Warning: Wallet update failed:', error);
  }
}

/**
 * Get customer's collection history and metrics
 */
export async function getCustomerCollectionMetrics(customer_id: string) {
  try {
    const { data, error } = await supabase
      .from('customer_dashboard_view')
      .select('*')
      .eq('customer_id', customer_id);

    if (error) {
      console.error('❌ Error fetching customer metrics:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Error in getCustomerCollectionMetrics:', error);
    throw error;
  }
}

/**
 * Get real-time collection updates for a customer
 */
export function subscribeToCustomerCollections(customer_id: string, callback: (data: any) => void) {
  return supabase
    .channel(`customer_collections_${customer_id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pickups',
        filter: `customer_id=eq.${customer_id}`
      },
      callback
    )
    .subscribe();
}
