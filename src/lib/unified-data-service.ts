import { supabase } from './supabase';
import { realtimeManager } from './realtimeManager';

// Unified interfaces for shared data
export interface UnifiedPickup {
  id: string;
  customer_id: string;
  collector_id?: string;
  status: 'submitted' | 'approved' | 'rejected' | 'in_progress' | 'completed';
  started_at: string;
  submitted_at?: string;
  completed_at?: string;
  total_kg?: number;
  total_value?: number;
  notes?: string;
  
  // Customer information
  customer: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
  
  // Address information
  address: {
    line1: string;
    suburb: string;
    city: string;
    postal_code?: string;
  };
  
  // Pickup items with materials
  items: Array<{
    id: string;
    material_id: string;
    material_name: string;
    kilograms: number;
    rate_per_kg: number;
    value: number;
    notes?: string;
  }>;
  
  // Environmental impact
  environmental_impact: {
    co2_saved: number;
    water_saved: number;
    landfill_saved: number;
    trees_equivalent: number;
  };
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface UnifiedCustomer {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: 'CUSTOMER' | 'COLLECTOR' | 'ADMIN' | 'STAFF';
  is_active: boolean;
  
  // Statistics
  total_pickups: number;
  total_kg_recycled: number;
  total_value_earned: number;
  total_co2_saved: number;
  
  // Address
  addresses: Array<{
    id: string;
    line1: string;
    suburb: string;
    city: string;
    postal_code?: string;
    is_primary: boolean;
  }>;
  
  // Recent pickups
  recent_pickups: Array<{
    id: string;
    status: string;
    started_at: string;
    total_kg: number;
    total_value: number;
  }>;
  
  created_at: string;
  updated_at: string;
}

export interface UnifiedCollector {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: 'COLLECTOR';
  is_active: boolean;
  
  // Performance metrics
  total_pickups_assigned: number;
  total_pickups_completed: number;
  total_kg_collected: number;
  total_value_generated: number;
  
  // Current assignments
  active_pickups: Array<{
    id: string;
    customer_name: string;
    address: string;
    status: string;
    started_at: string;
    total_kg?: number;
  }>;
  
  // Availability
  is_available: boolean;
  current_location?: {
    latitude: number;
    longitude: number;
    updated_at: string;
  };
  
  created_at: string;
  updated_at: string;
}

export interface UnifiedSystemStats {
  // Overall system metrics
  total_users: number;
  total_pickups: number;
  total_kg_recycled: number;
  total_value_generated: number;
  total_co2_saved: number;
  
  // User breakdown
  customers_count: number;
  collectors_count: number;
  admins_count: number;
  
  // Pickup status breakdown
  pending_pickups: number;
  approved_pickups: number;
  in_progress_pickups: number;
  completed_pickups: number;
  rejected_pickups: number;
  
  // Performance metrics
  average_pickup_value: number;
  average_pickup_weight: number;
  system_health: 'excellent' | 'good' | 'warning' | 'critical';
  
  // Real-time status
  last_sync: string;
  active_collectors: number;
  realtime_connections: number;
}

// Unified Data Service Class
export class UnifiedDataService {
  private static instance: UnifiedDataService;
  
  public static getInstance(): UnifiedDataService {
    if (!UnifiedDataService.instance) {
      UnifiedDataService.instance = new UnifiedDataService();
    }
    return UnifiedDataService.instance;
  }

  // Get unified pickup data (shared between admin and collector)
  async getUnifiedPickups(filters?: {
    status?: string;
    customer_id?: string;
    collector_id?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: UnifiedPickup[]; error: any }> {
    try {
      // First, get the basic collection data from unified schema
      let query = supabase
        .from('unified_collections')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      if (filters?.collector_id) {
        query = query.eq('collector_id', filters.collector_id);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);
      }

      const { data: collections, error: collectionsError } = await query;

      if (collectionsError) {
        return { data: [], error: collectionsError };
      }

      if (!collections || collections.length === 0) {
        return { data: [], error: null };
      }

      // Now get the related data separately to avoid foreign key constraint issues
      const collectionIds = collections.map(c => c.id);
      const customerIds = collections.map(c => c.customer_id).filter((id, index, arr) => arr.indexOf(id) === index);
      const addressIds = collections.map(c => c.pickup_address_id).filter((id, index, arr) => arr.indexOf(id) === index);

      // Get customers (only if we have customer IDs)
      let customers: any[] = [];
      if (customerIds.length > 0) {
        const { data: customersData, error: customersError } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, phone, role')
          .in('id', customerIds);

        if (customersError) {
          return { data: [], error: customersError };
        }
        customers = customersData || [];
      }

      // Get addresses (only if we have address IDs)
      let addresses: any[] = [];
      if (addressIds.length > 0) {
        const { data: addressesData, error: addressesError } = await supabase
          .from('user_addresses')
          .select('id, address_line1, city, province, postal_code')
          .in('id', addressIds);

        if (addressesError) {
          return { data: [], error: addressesError };
        }
        addresses = addressesData || [];
      }

      // Get collection materials (only if we have collection IDs)
      let collectionMaterials: any[] = [];
      if (collectionIds.length > 0) {
        const { data: materialsData, error: itemsError } = await supabase
          .from('collection_materials')
          .select(`
            id,
            collection_id,
            material_id,
            quantity,
            unit,
            unit_price,
            material_name,
            material_category
          `)
          .in('collection_id', collectionIds);

        if (itemsError) {
          return { data: [], error: itemsError };
        }
        collectionMaterials = materialsData || [];
      }

      // Create lookup maps for efficient data access
      const customersMap = new Map(customers?.map(c => [c.id, c]) || []);
      const addressesMap = new Map(addresses?.map(a => [a.id, a]) || []);
      const materialsMap = new Map();
      
      // Group materials by collection_id
      collectionMaterials?.forEach(material => {
        if (!materialsMap.has(material.collection_id)) {
          materialsMap.set(material.collection_id, []);
        }
        materialsMap.get(material.collection_id).push(material);
      });

      // Process and unify the data
      const unifiedPickups: UnifiedPickup[] = collections.map(collection => {
        const customer = customersMap.get(collection.customer_id);
        const address = addressesMap.get(collection.pickup_address_id);
        const materials = materialsMap.get(collection.id) || [];

        const processedItems = materials.map((material: any) => ({
          id: material.id,
          material_id: material.material_id,
          material_name: material.material_name || 'Unknown',
          kilograms: material.quantity || 0,
          rate_per_kg: material.unit_price || 0,
          value: (material.quantity || 0) * (material.unit_price || 0),
          notes: material.condition_notes
        }));

        // Calculate environmental impact
        const totalKg = processedItems.reduce((sum: number, item: any) => sum + item.kilograms, 0);
        const environmental_impact = {
          co2_saved: totalKg * 2.5, // Approximate CO2 saved per kg
          water_saved: totalKg * 25, // Approximate water saved per kg
          landfill_saved: totalKg * 0.8, // Approximate landfill saved per kg
          trees_equivalent: (totalKg * 2.5) / 22 // 22 kg CO2 = 1 tree
        };

        return {
          id: collection.id,
          customer_id: collection.customer_id,
          collector_id: collection.collector_id,
          status: collection.status,
          started_at: collection.created_at, // Use created_at as started_at
          submitted_at: collection.created_at,
          completed_at: collection.completed_at,
          total_kg: collection.total_weight_kg,
          total_value: collection.total_value,
          notes: collection.customer_notes || collection.collector_notes,
          customer: {
            id: customer?.id || collection.customer_id || '',
            full_name: customer?.full_name || collection.customer_name || 'Unknown',
            email: customer?.email || collection.customer_email || '',
            phone: customer?.phone || collection.customer_phone || ''
          },
          address: {
            line1: address?.address_line1 || collection.pickup_address || '',
            suburb: '', // Not available in unified schema
            city: address?.city || '',
            postal_code: address?.postal_code || ''
          },
          items: processedItems,
          environmental_impact,
          created_at: collection.created_at,
          updated_at: collection.updated_at
        };
      });

      return { data: unifiedPickups, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get unified customer data
  async getUnifiedCustomers(filters?: {
    is_active?: boolean;
    role?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: UnifiedCustomer[]; error: any }> {
    try {
      let query = supabase
        .from('user_profiles')
        .select(`
          *,
          user_addresses(
            id,
            address_line1,
            city,
            province,
            postal_code,
            is_default
          )
        `)
        .eq('role', 'member')
        .order('full_name', { ascending: true });

      if (filters?.is_active !== undefined) {
        query = query.eq('status', filters.is_active ? 'active' : 'inactive');
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error };
      }

      // Get additional statistics for each customer
      const customersWithStats = await Promise.all(
        (data || []).map(async (customer) => {
          const { data: collections } = await supabase
            .from('unified_collections')
            .select('id, status, created_at, total_weight_kg, total_value')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
            .limit(5);

          const totalPickups = collections?.length || 0;
          const totalKg = collections?.reduce((sum, c) => sum + (c.total_weight_kg || 0), 0) || 0;
          const totalValue = collections?.reduce((sum, c) => sum + (c.total_value || 0), 0) || 0;
          const totalCO2 = totalKg * 2.5;

          const unified: UnifiedCustomer = {
            id: customer.id,
            full_name: customer.full_name,
            email: customer.email,
            phone: customer.phone,
            role: 'CUSTOMER',
            is_active: customer.is_active,
            total_pickups: totalPickups,
            total_kg_recycled: totalKg,
            total_value_earned: totalValue,
            total_co2_saved: totalCO2,
            addresses: customer.user_addresses || [],
            recent_pickups: (collections || []).map(c => ({
              id: c.id,
              status: c.status,
              started_at: c.created_at,
              total_kg: c.total_weight_kg || 0,
              total_value: c.total_value || 0
            })),
            created_at: customer.created_at,
            updated_at: customer.updated_at
          };
          return unified;
        })
      );

      return { data: customersWithStats, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get unified collector data
  async getUnifiedCollectors(filters?: {
    is_active?: boolean;
    is_available?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ data: UnifiedCollector[]; error: any }> {
    try {
      let query = supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'collector')
        .order('full_name', { ascending: true });

      if (filters?.is_active !== undefined) {
        query = query.eq('status', filters.is_active ? 'active' : 'inactive');
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error };
      }

      // Get additional statistics for each collector
      const collectorsWithStats = await Promise.all(
        (data || []).map(async (collector) => {
          // Get collections for this collector with simple queries to avoid foreign key issues
          const { data: collections } = await supabase
            .from('unified_collections')
            .select('id, status, created_at, total_weight_kg, total_value, customer_id, pickup_address_id')
            .eq('collector_id', collector.id)
            .order('created_at', { ascending: false });

          const totalAssigned = collections?.length || 0;
          const totalCompleted = collections?.filter(c => c.status === 'completed').length || 0;
          const totalKg = collections?.reduce((sum, c) => sum + (c.total_weight_kg || 0), 0) || 0;
          const totalValue = collections?.reduce((sum, c) => sum + (c.total_value || 0), 0) || 0;

          // Get customer and address information separately to avoid join issues
          const customerIds = collections?.map(c => c.customer_id).filter((id, index, arr) => arr.indexOf(id) === index) || [];
          const addressIds = collections?.map(c => c.pickup_address_id).filter((id, index, arr) => arr.indexOf(id) === index && id !== null) || [];

          const [customersResult, addressesResult] = await Promise.all([
            customerIds.length > 0 ? supabase.from('user_profiles').select('id, full_name').in('id', customerIds) : { data: [], error: null },
            addressIds.length > 0 ? supabase.from('user_addresses').select('id, address_line1, city').or(addressIds.map((id: string) => `id.eq.${id}`).join(',')) : { data: [], error: null }
          ]);

          const customersMap = new Map(customersResult.data?.map(c => [c.id, c]) || []);
          const addressesMap = new Map(addressesResult.data?.map(a => [a.id, a]) || []);

          const activePickups = collections
            ?.filter(c => ['pending', 'approved', 'in_progress'].includes(c.status))
            .map(c => {
              const customer = customersMap.get(c.customer_id);
              const address = addressesMap.get(c.pickup_address_id);
              
              return {
                id: c.id,
                customer_name: customer?.full_name || 'Unknown',
                address: address ? `${address.address_line1 || ''}, ${address.city || ''}` : 'No address',
                status: c.status,
                started_at: c.created_at,
                total_kg: c.total_weight_kg
              };
            }) || [];

          return {
            id: collector.id,
            full_name: collector.full_name,
            email: collector.email,
            phone: collector.phone,
            role: collector.role,
            is_active: collector.is_active,
            total_pickups_assigned: totalAssigned,
            total_pickups_completed: totalCompleted,
            total_kg_collected: totalKg,
            total_value_generated: totalValue,
            active_pickups: activePickups,
            is_available: true, // Default to true, can be updated based on business logic
            created_at: collector.created_at,
            updated_at: collector.updated_at
          };
        })
      );

      return { data: collectorsWithStats, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get unified system statistics
  async getUnifiedSystemStats(): Promise<{ data: UnifiedSystemStats | null; error: any }> {
    try {
      const [
        profilesResult,
        collectionsResult,
        collectionMaterialsResult,
        activeProfilesResult
      ] = await Promise.all([
        supabase.from('user_profiles').select('id, role, status'),
        supabase.from('unified_collections').select('*'),
        supabase.from('collection_materials').select('quantity'),
        supabase.from('user_profiles').select('id, role').eq('status', 'active')
      ]);

      if (profilesResult.error || collectionsResult.error || collectionMaterialsResult.error || activeProfilesResult.error) {
        throw new Error('Failed to fetch system data');
      }

      const profiles = profilesResult.data || [];
      const collections = collectionsResult.data || [];
      const collectionMaterials = collectionMaterialsResult.data || [];
      const activeProfiles = activeProfilesResult.data || [];

      // Calculate system statistics
      const totalKgRecycled = collectionMaterials.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const totalValueGenerated = collections.reduce((sum, c) => sum + (c.total_value || 0), 0);
      const totalCO2Saved = totalKgRecycled * 2.5;

      const customersCount = profiles.filter(p => p.role === 'member').length;
      const collectorsCount = profiles.filter(p => p.role === 'collector').length;
      const adminsCount = profiles.filter(p => ['admin', 'office'].includes(p.role)).length;

      const pendingPickups = collections.filter(c => c.status === 'pending').length;
      const approvedPickups = collections.filter(c => c.status === 'approved').length;
      const inProgressPickups = collections.filter(c => c.status === 'in_progress').length;
      const completedPickups = collections.filter(c => c.status === 'completed').length;
      const rejectedPickups = collections.filter(c => c.status === 'rejected').length;

      const averagePickupValue = collections.length > 0 ? totalValueGenerated / collections.length : 0;
      const averagePickupWeight = collections.length > 0 ? totalKgRecycled / collections.length : 0;

      // Determine system health
      let systemHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
      if (pendingPickups > 10) systemHealth = 'warning';
      if (pendingPickups > 20) systemHealth = 'critical';

      const stats: UnifiedSystemStats = {
        total_users: profiles.length,
        total_pickups: collections.length,
        total_kg_recycled: totalKgRecycled,
        total_value_generated: totalValueGenerated,
        total_co2_saved: totalCO2Saved,
        customers_count: customersCount,
        collectors_count: collectorsCount,
        admins_count: adminsCount,
        pending_pickups: pendingPickups,
        approved_pickups: approvedPickups,
        in_progress_pickups: inProgressPickups,
        completed_pickups: completedPickups,
        rejected_pickups: rejectedPickups,
        average_pickup_value: averagePickupValue,
        average_pickup_weight: averagePickupWeight,
        system_health: systemHealth,
        last_sync: new Date().toISOString(),
        active_collectors: activeProfiles.filter(p => p.role === 'collector').length,
        realtime_connections: 3 // Pickups, items, profiles
      };

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Real-time subscription setup for unified data
  setupUnifiedRealtimeSubscriptions(callbacks: {
    onPickupChange?: (payload: any) => void;
    onCustomerChange?: (payload: any) => void;
    onCollectorChange?: (payload: any) => void;
    onSystemChange?: (payload: any) => void;
  }) {
    const channels: any[] = [];

    // Collections channel
    if (callbacks.onPickupChange) {
      realtimeManager.subscribe('unified_collections_changes', (channel) => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'unified_collections' }, callbacks.onPickupChange!)
      })
      channels.push('unified_collections_changes' as any)
    }

    // Customers channel
    if (callbacks.onCustomerChange) {
      realtimeManager.subscribe('unified_customers_changes', (channel) => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, (payload: any) => {
          if (payload.new?.role === 'member' || payload.old?.role === 'member') {
            callbacks.onCustomerChange!(payload)
          }
        })
      })
      channels.push('unified_customers_changes' as any)
    }

    // Collectors channel
    if (callbacks.onCollectorChange) {
      realtimeManager.subscribe('unified_collectors_changes', (channel) => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, (payload: any) => {
          if (payload.new?.role === 'collector' || payload.old?.role === 'collector') {
            callbacks.onCollectorChange!(payload)
          }
        })
      })
      channels.push('unified_collectors_changes' as any)
    }

    // System-wide changes
    if (callbacks.onSystemChange) {
      realtimeManager.subscribe('unified_system_changes', (channel) => {
        channel.on('postgres_changes', { event: '*', schema: 'public' }, callbacks.onSystemChange!)
      })
      channels.push('unified_system_changes' as any)
    }

    // Return cleanup function
    return () => {
      channels.forEach((name: any) => {
        if (typeof name === 'string') {
          realtimeManager.unsubscribe(name)
        } else {
          try { name?.unsubscribe?.() } catch {}
        }
      })
    };
  }
}

// Export singleton instance
export const unifiedDataService = UnifiedDataService.getInstance();
