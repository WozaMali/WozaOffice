import { getSupabaseClient, getSupabaseAdminClient } from './supabase';

// Get collector ID by email (for real collector data)
export async function getCollectorIdByEmail(email: string): Promise<string | null> {
  try {
    console.log('🔍 Looking up collector ID for email:', email);
    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized. Ensure NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is set.');
    }
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('role_id', 'collector')
      .eq('status', 'active')
      .single();
    
    if (error) {
      console.error('❌ Error looking up collector ID:', error);
      return null;
    }
    
    if (data && data.id) {
      console.log('✅ Found collector ID:', data.id);
      return data.id;
    }
    
    console.log('⚠️ No collector found for email:', email);
    return null;
  } catch (error: any) {
    console.error('❌ Error in getCollectorIdByEmail:', error);
    return null;
  }
}

// Test Supabase connection
export async function testSupabaseConnection() {
  try {
    console.log('🔌 Testing Supabase connection...');
    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized. Ensure NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is set.');
    }
    console.log('🔌 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set');
    console.log('🔌 Supabase Key length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0);
    
    // Try to connect to the database first
    console.log('🔌 Testing basic database connectivity...');
    
    // Test with a simple query that should work
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role_id', 'collector')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection test failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      });
      
      // Try a different approach - test if we can at least connect
      console.log('🔌 Trying alternative connection test...');
      try {
        const supabase = getSupabaseClient();
        const { data: testData, error: testError } = await supabase
          .rpc('version');
        
        if (testError) {
          console.error('❌ Alternative connection test also failed:', testError);
          return {
            success: false,
            error: `Database connection failed: ${error.message}. Alternative test also failed: ${testError.message}`,
            details: { originalError: error, alternativeError: testError }
          };
        } else {
          console.log('✅ Alternative connection test passed:', testData);
          return {
            success: true,
            message: 'Database connection successful (alternative method)',
            details: { method: 'rpc_version' }
          };
        }
      } catch (altError: any) {
        console.error('❌ Alternative connection test error:', altError);
        return {
          success: false,
          error: `Database connection failed: ${error.message}. Alternative test error: ${altError.message}`,
          details: { originalError: error, alternativeError: altError }
        };
      }
    }
    
    console.log('✅ Supabase connection test passed');
    console.log('✅ Test data received:', data);
    return {
      success: true,
      message: 'Database connection successful'
    };
  } catch (error: any) {
    console.error('❌ Supabase connection test error:', error);
    console.error('❌ Error details:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      fullError: error
    });
    return {
      success: false,
      error: error.message || 'Unknown connection error',
      details: error
    };
  }
}

// Check if required database tables exist
export async function checkRequiredTables() {
  const requiredTables = ['profiles', 'pickups', 'materials', 'pickup_items', 'pickup_photos'];
  const tableStatus: { [key: string]: boolean } = {};
  
  try {
    console.log('🔍 Checking required database tables...');
    const supabase = getSupabaseClient();
    for (const tableName of requiredTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);
        
        if (error) {
          console.error(`❌ Table ${tableName} check failed:`, error);
          tableStatus[tableName] = false;
        } else {
          console.log(`✅ Table ${tableName} exists and accessible`);
          tableStatus[tableName] = true;
        }
      } catch (err: any) {
        console.error(`❌ Error checking table ${tableName}:`, err);
        tableStatus[tableName] = false;
      }
    }
    
    const missingTables = requiredTables.filter(table => !tableStatus[table]);
    const availableTables = requiredTables.filter(table => tableStatus[table]);
    
    console.log('📊 Table availability summary:');
    console.log('✅ Available tables:', availableTables);
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables);
    }
    
    return {
      success: missingTables.length === 0,
      availableTables,
      missingTables,
      tableStatus,
      message: missingTables.length === 0 
        ? 'All required tables are available' 
        : `Missing tables: ${missingTables.join(', ')}`
    };
  } catch (error: any) {
    console.error('❌ Error checking required tables:', error);
    return {
      success: false,
      error: error.message || 'Unknown error checking tables',
      details: error
    };
  }
}

export interface CollectorPickup {
  id: string;
  customer_id: string;
  collector_id: string;
  address_id: string;
  started_at: string;
  submitted_at?: string;
  lat?: number;
  lng?: number;
  status: 'submitted' | 'approved' | 'rejected';
  approval_note?: string;
  total_kg?: number;
  total_value?: number;
  payment_status?: 'pending' | 'paid' | 'failed';
  payment_method?: string;
  customer_name?: string;
  collector_name?: string;
  pickup_date?: string;
  customer?: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
  };
  address?: {
    id: string;
    line1: string;
    suburb: string;
    city: string;
    postal_code?: string;
  };
  items?: Array<{
    id: string;
    material_id: string;
    kilograms: number;
    contamination_pct?: number;
    material?: {
      id: string;
      name: string;
      rate_per_kg: number;
      unit: string;
    };
  }>;
  photos?: Array<{
    id: string;
    url: string;
    taken_at: string;
    type?: 'scale' | 'bags' | 'other';
  }>;
}

export interface CollectorStats {
  totalPickups: number;
  totalWeight: number;
  totalValue: number;
  pendingPickups: number;
  completedPickups: number;
  averagePickupValue: number;
  thisMonthPickups: number;
  thisMonthWeight: number;
  thisMonthValue: number;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  rate_per_kg: number;
  is_active: boolean;
}

// Get collector's pickups with full details
export async function getCollectorPickups(collectorId: string): Promise<CollectorPickup[]> {
  try {
    console.log('🔍 Getting collector pickups for:', collectorId);
    const supabase = getSupabaseClient();
    // First, test the database connection
    const { data: testData, error: testError } = await supabase
      .from('pickups')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection test failed:', testError);
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    
    console.log('✅ Database connection test passed');
    
    // Now get the actual pickups data
    const { data, error } = await getSupabaseClient()
      .from('pickups')

    if (error) {
      console.error('❌ Error getting collector pickups:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log(`✅ Retrieved ${data?.length || 0} pickups for collector ${collectorId}`);
    
    if (data && data.length > 0) {
      console.log('📦 Sample pickup data:', data[0]);
    }
    
    return data || [];
  } catch (error: any) {
    console.error('❌ Error in getCollectorPickups:', error);
    console.error('❌ Error details:', {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      stack: error?.stack
    });
    
    // Return empty array if there's an error
    console.log('⚠️ Returning empty pickups array due to error');
    return [];
  }
}

// Get collector statistics
export async function getCollectorStats(collectorId: string): Promise<CollectorStats> {
  try {
    console.log('📊 Getting collector stats for:', collectorId);
    const supabase = getSupabaseClient();
    // First, test the database connection
    const { data: testData, error: testError } = await supabase
      .from('pickups')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection test failed:', testError);
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    
    console.log('✅ Database connection test passed');
    
    // Now get the actual pickups data
    const { data, error } = await supabase
      .from('pickups')
      .select('*')
      .eq('collector_id', collectorId);


    if (error) {
      console.error('❌ Error getting collector stats:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    const pickups = data || [];
    console.log(`📊 Found ${pickups.length} pickups for collector ${collectorId}`);
    
    if (pickups.length > 0) {
      console.log('📦 Sample pickup for stats:', {
        id: pickups[0].id,
        status: pickups[0].status,
        total_kg: pickups[0].total_kg,
        total_value: pickups[0].total_value,
        created_at: pickups[0].created_at
      });
    }
    
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthPickups = pickups.filter(p => 
      new Date(p.created_at || p.started_at) >= thisMonth
    );

    const stats: CollectorStats = {
      totalPickups: pickups.length,
      totalWeight: pickups.reduce((sum, p) => sum + (p.total_kg || 0), 0),
      totalValue: pickups.reduce((sum, p) => sum + (p.total_value || 0), 0),
      pendingPickups: pickups.filter(p => p.status === 'submitted').length,
      completedPickups: pickups.filter(p => p.status === 'approved').length,
      averagePickupValue: pickups.length > 0 ? 
        pickups.reduce((sum, p) => sum + (p.total_value || 0), 0) / pickups.length : 0,
      thisMonthPickups: thisMonthPickups.length,
      thisMonthWeight: thisMonthPickups.reduce((sum, p) => sum + (p.total_kg || 0), 0),
      thisMonthValue: thisMonthPickups.reduce((sum, p) => sum + (p.total_value || 0), 0),
    };

    console.log('✅ Collector stats calculated:', stats);
    return stats;
  } catch (error: any) {
    console.error('❌ Error in getCollectorStats:', error);
    console.error('❌ Error details:', {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      stack: error?.stack
    });
    
    // Return default stats if there's an error
    const defaultStats: CollectorStats = {
      totalPickups: 0,
      totalWeight: 0,
      totalValue: 0,
      pendingPickups: 0,
      completedPickups: 0,
      averagePickupValue: 0,
      thisMonthPickups: 0,
      thisMonthWeight: 0,
      thisMonthValue: 0,
    };
    
    console.log('⚠️ Returning default stats due to error:', defaultStats);
    return defaultStats;
  }
}

// Get all active materials
export async function getMaterials(): Promise<Material[]> {
  try {
    console.log('🔍 Getting materials...');
    const supabase = getSupabaseClient();
    // First, test the database connection
    const { data: testData, error: testError } = await supabase
      .from('materials')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection test failed:', testError);
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    
    console.log('✅ Database connection test passed');
    
    // Now get the actual materials data
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('is_active', true)
      .order('name');


    if (error) {
      console.error('❌ Error getting materials:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log(`✅ Retrieved ${data?.length || 0} materials`);
    
    if (data && data.length > 0) {
      console.log('📦 Sample material data:', data[0]);
    }
    
    return data || [];
  } catch (error: any) {
    console.error('❌ Error in getMaterials:', error);
    console.error('❌ Error details:', {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      stack: error?.stack
    });
    
    // Return empty array if there's an error
    console.log('⚠️ Returning empty materials array due to error');
    return [];
  }
}

// Create a new pickup
export async function createPickup(pickupData: {
  customer_id: string;
  address_id: string;
  collector_id: string;
  total_kg: number;
  total_value: number;
  notes?: string;
}): Promise<string> {
  try {
    console.log('📝 Creating new pickup:', pickupData);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('pickups')
      .insert([{
        ...pickupData,
        status: 'submitted',
        started_at: new Date().toISOString(),
        payment_status: 'pending',
      }])
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error creating pickup:', error);
      throw error;
    }

    console.log('✅ Pickup created with ID:', data.id);
    return data.id;
  } catch (error) {
    console.error('❌ Error in createPickup:', error);
    throw error;
  }
}

// Add pickup items
export async function addPickupItems(pickupId: string, items: Array<{
  material_id: string;
  kilograms: number;
  contamination_pct?: number;
}>): Promise<void> {
  try {
    console.log('📦 Adding pickup items for pickup:', pickupId);
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('pickup_items')
      .insert(items.map(item => ({
        ...item,
        pickup_id: pickupId,
      })));

    if (error) {
      console.error('❌ Error adding pickup items:', error);
      throw error;
    }

    console.log(`✅ Added ${items.length} items to pickup`);
  } catch (error) {
    console.error('❌ Error in addPickupItems:', error);
    throw error;
  }
}

// Add pickup photos
export async function addPickupPhotos(pickupId: string, photos: Array<{
  url: string;
  type?: 'scale' | 'bags' | 'other';
}>): Promise<void> {
  try {
    console.log('📸 Adding pickup photos for pickup:', pickupId);
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('pickup_photos')
      .insert(photos.map(photo => ({
        ...photo,
        pickup_id: pickupId,
        taken_at: new Date().toISOString(),
      })));

    if (error) {
      console.error('❌ Error adding pickup photos:', error);
      throw error;
    }

    console.log(`✅ Added ${photos.length} photos to pickup`);
  } catch (error) {
    console.error('❌ Error in addPickupPhotos:', error);
    throw error;
  }
}

// Subscribe to real-time pickup changes for a collector
export function subscribeToCollectorPickups(collectorId: string, callback: (payload: any) => void) {
  const supabase = getSupabaseClient();
  return supabase
    .channel(`collector_pickups_${collectorId}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'pickups',
      filter: `collector_id=eq.${collectorId}`
    }, (payload) => {
      console.log('🔄 Collector pickup change detected:', payload);
      callback(payload);
    })
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'pickup_items',
    }, (payload) => {
      console.log('🔄 Pickup item change detected:', payload);
      callback(payload);
    })
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'pickup_photos',
    }, (payload) => {
      console.log('🔄 Pickup photo change detected:', payload);
      callback(payload);
    })
    .subscribe();
}

// Subscribe to material changes
export function subscribeToMaterials(callback: (payload: any) => void) {
  const supabase = getSupabaseClient();
  return supabase
    .channel('materials_changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'materials' 
    }, (payload) => {
      console.log('🔄 Material change detected:', payload);
      callback(payload);
    })
    .subscribe();
}