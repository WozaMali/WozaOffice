/**
 * Pickup Service
 * Handles CRUD operations for pickup management
 */

import { supabase } from './supabase';

export interface Pickup {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  totalKg: number;
  totalValue: number;
  materials: {
    name: string;
    kilograms: number;
    photos: string[];
  }[];
  createdAt: string;
  notes?: string;
}

export interface PickupFilters {
  status?: string;
  search?: string;
  collectorId?: string;
}

/**
 * Get all pickups for a collector
 */
export async function getCollectorPickups(collectorId: string, filters?: PickupFilters): Promise<{ data: Pickup[] | null; error: any }> {
  try {
    let query = supabase
      .from('pickups')
      .select(`
        id,
        status,
        total_kg,
        total_value,
        notes,
        created_at,
        customer:user_profiles!pickups_user_id_fkey(
          full_name,
          phone
        ),
        address:user_addresses!pickups_pickup_address_id_fkey(
          street_address,
          suburb,
          city,
          province
        ),
        pickup_items(
          kilograms,
          material:materials(name)
        ),
        collection_photos(
          photo_url
        )
      `)
      .eq('collector_id', collectorId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching collector pickups:', error);
      return { data: null, error };
    }

    // Transform the data to match the Pickup interface
    const transformedPickups: Pickup[] = (data || []).map((pickup: any) => ({
      id: pickup.id,
      customerName: pickup.customer?.full_name || 'Unknown Customer',
      customerPhone: pickup.customer?.phone || 'No phone',
      address: pickup.address ? 
        `${pickup.address.street_address}, ${pickup.address.suburb}, ${pickup.address.city}, ${pickup.address.province}` :
        'No address',
      status: pickup.status,
      totalKg: pickup.total_kg || 0,
      totalValue: pickup.total_value || 0,
      materials: (pickup.pickup_items || []).map((item: any) => ({
        name: item.material?.name || 'Unknown Material',
        kilograms: item.kilograms || 0,
        photos: (pickup.collection_photos || []).map((photo: any) => photo.photo_url)
      })),
      createdAt: pickup.created_at,
      notes: pickup.notes
    }));

    // Apply search filter if provided
    let filteredPickups = transformedPickups;
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredPickups = transformedPickups.filter(pickup =>
        pickup.customerName.toLowerCase().includes(searchTerm) ||
        pickup.address.toLowerCase().includes(searchTerm) ||
        pickup.notes?.toLowerCase().includes(searchTerm)
      );
    }

    return { data: filteredPickups, error: null };
  } catch (error) {
    console.error('Exception in getCollectorPickups:', error);
    return { data: null, error };
  }
}

/**
 * Get all pickups (admin view)
 */
export async function getAllPickups(filters?: PickupFilters): Promise<{ data: Pickup[] | null; error: any }> {
  try {
    let query = supabase
      .from('pickups')
      .select(`
        id,
        status,
        total_kg,
        total_value,
        notes,
        created_at,
        customer:user_profiles!pickups_user_id_fkey(
          full_name,
          phone
        ),
        collector:user_profiles!pickups_collector_id_fkey(
          full_name
        ),
        address:user_addresses!pickups_pickup_address_id_fkey(
          street_address,
          suburb,
          city,
          province
        ),
        pickup_items(
          kilograms,
          material:materials(name)
        ),
        collection_photos(
          photo_url
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all pickups:', error);
      return { data: null, error };
    }

    // Transform the data to match the Pickup interface
    const transformedPickups: Pickup[] = (data || []).map((pickup: any) => ({
      id: pickup.id,
      customerName: pickup.customer?.full_name || 'Unknown Customer',
      customerPhone: pickup.customer?.phone || 'No phone',
      address: pickup.address ? 
        `${pickup.address.street_address}, ${pickup.address.suburb}, ${pickup.address.city}, ${pickup.address.province}` :
        'No address',
      status: pickup.status,
      totalKg: pickup.total_kg || 0,
      totalValue: pickup.total_value || 0,
      materials: (pickup.pickup_items || []).map((item: any) => ({
        name: item.material?.name || 'Unknown Material',
        kilograms: item.kilograms || 0,
        photos: (pickup.collection_photos || []).map((photo: any) => photo.photo_url)
      })),
      createdAt: pickup.created_at,
      notes: pickup.notes
    }));

    // Apply search filter if provided
    let filteredPickups = transformedPickups;
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredPickups = transformedPickups.filter(pickup =>
        pickup.customerName.toLowerCase().includes(searchTerm) ||
        pickup.address.toLowerCase().includes(searchTerm) ||
        pickup.notes?.toLowerCase().includes(searchTerm)
      );
    }

    return { data: filteredPickups, error: null };
  } catch (error) {
    console.error('Exception in getAllPickups:', error);
    return { data: null, error };
  }
}

/**
 * Update pickup status
 */
export async function updatePickupStatus(pickupId: string, status: string): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('pickups')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', pickupId);

    if (error) {
      console.error('Error updating pickup status:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception in updatePickupStatus:', error);
    return { success: false, error };
  }
}

/**
 * Get pickup statistics
 */
export async function getPickupStats(collectorId?: string): Promise<{ data: any; error: any }> {
  try {
    let query = supabase
      .from('pickups')
      .select('status, total_kg, total_value, created_at');

    if (collectorId) {
      query = query.eq('collector_id', collectorId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pickup stats:', error);
      return { data: null, error };
    }

    const stats = {
      total: data?.length || 0,
      pending: data?.filter(p => p.status === 'pending').length || 0,
      approved: data?.filter(p => p.status === 'approved').length || 0,
      completed: data?.filter(p => p.status === 'completed').length || 0,
      cancelled: data?.filter(p => p.status === 'cancelled').length || 0,
      totalKg: data?.reduce((sum, p) => sum + (p.total_kg || 0), 0) || 0,
      totalValue: data?.reduce((sum, p) => sum + (p.total_value || 0), 0) || 0
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('Exception in getPickupStats:', error);
    return { data: null, error };
  }
}
