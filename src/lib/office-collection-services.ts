import { supabase } from './supabase';

export interface CollectionWithDetails {
  id: string;
  resident_id: string;
  resident_name: string;
  resident_email: string;
  resident_phone: string;
  collector_id: string;
  collector_name: string;
  collector_email: string;
  collector_phone: string;
  area_id: string;
  area_name: string;
  material_id: string;
  material_name: string;
  material_unit_price: number;
  weight_kg: number;
  estimated_value: number;
  photo_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  collection_date: string;
  contributes_to_green_scholar_fund: boolean;
  green_scholar_fund_amount: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionStats {
  total_collections: number;
  pending_collections: number;
  approved_collections: number;
  rejected_collections: number;
  total_weight_kg: number;
  total_estimated_value: number;
  total_green_scholar_fund: number;
  avg_weight_per_collection: number;
  last_collection_date: string | null;
}

export interface GreenScholarFundSummary {
  month: string;
  total_fund_amount: number;
  unique_residents_contributing: number;
  unique_collectors_contributing: number;
  total_pet_collections: number;
}

/**
 * Get all collections with full details for Office App
 */
export async function getAllCollections(): Promise<CollectionWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('collection_details')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching collections:', error);
      throw error;
    }

    const rows = (data || []) as any[];

    // Backfill collector_name from users table if missing in view rows
    const missingNameIds = Array.from(new Set(
      rows
        .filter(r => (!r.collector_name || String(r.collector_name).trim() === '') && r.collector_id)
        .map(r => r.collector_id)
    ));

    const idToName = new Map<string, string>();
    if (missingNameIds.length > 0) {
      const { data: collectors } = await supabase
        .from('users')
        .select('id, full_name, first_name, last_name, email, phone')
        .in('id', missingNameIds);
      (collectors || []).forEach((u: any) => {
        const fullName = (u.full_name && String(u.full_name).trim())
          || `${u.first_name || ''} ${u.last_name || ''}`.trim()
          || u.email
          || 'Unassigned';
        idToName.set(String(u.id), fullName);
      });
    }

    const withNames = rows.map(r => {
      if (!r.collector_name || String(r.collector_name).trim() === '') {
        const fallback = idToName.get(String(r.collector_id)) || r.collector_name || 'Unassigned';
        return { ...r, collector_name: fallback } as CollectionWithDetails;
      }
      return r as CollectionWithDetails;
    });

    return withNames;
  } catch (error) {
    console.error('❌ Error in getAllCollections:', error);
    throw error;
  }
}

/**
 * Get collections by status
 */
export async function getCollectionsByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<CollectionWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('collection_details')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching collections by status:', error);
      throw error;
    }

    const rows = (data || []) as any[];
    const missingNameIds = Array.from(new Set(
      rows
        .filter(r => (!r.collector_name || String(r.collector_name).trim() === '') && r.collector_id)
        .map(r => r.collector_id)
    ));
    const idToName = new Map<string, string>();
    if (missingNameIds.length > 0) {
      const { data: collectors } = await supabase
        .from('users')
        .select('id, full_name, first_name, last_name, email')
        .in('id', missingNameIds);
      (collectors || []).forEach((u: any) => {
        const fullName = (u.full_name && String(u.full_name).trim())
          || `${u.first_name || ''} ${u.last_name || ''}`.trim()
          || u.email
          || 'Unassigned';
        idToName.set(String(u.id), fullName);
      });
    }
    return rows.map(r => (!r.collector_name || String(r.collector_name).trim() === '')
      ? ({ ...r, collector_name: idToName.get(String(r.collector_id)) || 'Unassigned' } as CollectionWithDetails)
      : (r as CollectionWithDetails));
  } catch (error) {
    console.error('❌ Error in getCollectionsByStatus:', error);
    throw error;
  }
}

/**
 * Get pending collections (for pickup page)
 */
export async function getPendingCollections(): Promise<CollectionWithDetails[]> {
  return getCollectionsByStatus('pending');
}

/**
 * Get approved collections (for collections page)
 */
export async function getApprovedCollections(): Promise<CollectionWithDetails[]> {
  return getCollectionsByStatus('approved');
}

/**
 * Update collection status (approve/reject)
 */
export async function updateCollectionStatus(
  collectionId: string, 
  status: 'approved' | 'rejected',
  notes?: string
): Promise<void> {
  try {
    // Use RPCs to ensure wallet/points updates and atomicity on unified schema
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) throw authErr || new Error('Not authenticated');

    if (status === 'approved') {
      const { error: rpcErr } = await supabase.rpc('approve_collection', {
        p_collection_id: collectionId,
        p_approver_id: authData.user.id,
        p_note: notes ?? null,
        p_idempotency_key: null
      });
      if (rpcErr) throw rpcErr;

      // After successful approval, process PET Bottles contribution for this collection (idempotent)
      try {
        await fetch('/api/green-scholar/pet-bottles-contribution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionId })
        });
      } catch (e) {
        console.warn('⚠️ PET contribution processing failed (non-blocking):', (e as any)?.message || e);
      }
    } else {
      const { error: rpcErr } = await supabase.rpc('reject_collection', {
        p_collection_id: collectionId,
        p_approver_id: authData.user.id,
        p_note: notes ?? null
      });
      if (rpcErr) throw rpcErr;
    }

    console.log(`✅ Collection ${collectionId} status updated to ${status} via RPC`);
  } catch (error) {
    console.error('❌ Error in updateCollectionStatus:', error);
    throw error;
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(): Promise<CollectionStats> {
  try {
    // Prefer unified_collections totals
    const { data, error } = await supabase
      .from('unified_collections')
      .select('status, total_weight_kg, computed_value, total_value, updated_at, created_at');

    if (error) {
      console.error('❌ Error fetching collection stats:', error);
      throw error;
    }

    const rows = (data || []) as any[];
    const isRevenue = (s: string) => ['approved','completed'].includes(String(s));
    const approvedRows = rows.filter(r => isRevenue(r.status));

    const stats: CollectionStats = {
      total_collections: rows.length,
      pending_collections: rows.filter(r => ['pending','submitted'].includes(String(r.status))).length,
      approved_collections: approvedRows.length,
      rejected_collections: rows.filter(r => String(r.status) === 'rejected').length,
      total_weight_kg: approvedRows.reduce((sum, r) => sum + (Number(r.total_weight_kg) || 0), 0),
      total_estimated_value: approvedRows.reduce((sum, r) => sum + (Number(r.computed_value ?? r.total_value) || 0), 0),
      total_green_scholar_fund: 0,
      avg_weight_per_collection: approvedRows.length > 0 ?
        approvedRows.reduce((sum, r) => sum + (Number(r.total_weight_kg) || 0), 0) / approvedRows.length : 0,
      last_collection_date: rows.length > 0 ?
        Math.max(...rows.map(r => new Date(r.updated_at || r.created_at).getTime())).toString() : null
    };

    return stats;
  } catch (error) {
    console.error('❌ Error in getCollectionStats:', error);
    throw error;
  }
}

/**
 * Get Green Scholar Fund summary
 */
export async function getGreenScholarFundSummary(): Promise<GreenScholarFundSummary[]> {
  try {
    const { data, error } = await supabase
      .from('green_scholar_fund_summary')
      .select('*')
      .order('month', { ascending: false });

    if (error) {
      console.error('❌ Error fetching Green Scholar Fund summary:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in getGreenScholarFundSummary:', error);
    throw error;
  }
}

/**
 * Get collector statistics
 */
export async function getCollectorStats(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('collector_stats')
      .select('*')
      .order('total_collections', { ascending: false });

    if (error) {
      console.error('❌ Error fetching collector stats:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in getCollectorStats:', error);
    throw error;
  }
}

/**
 * Search collections by resident name, collector name, or material
 */
export async function searchCollections(searchTerm: string): Promise<CollectionWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('collection_details')
      .select('*')
      .or(`resident_name.ilike.%${searchTerm}%,collector_name.ilike.%${searchTerm}%,material_name.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error searching collections:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in searchCollections:', error);
    throw error;
  }
}

/**
 * Get collections by date range
 */
export async function getCollectionsByDateRange(
  startDate: string, 
  endDate: string
): Promise<CollectionWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('collection_details')
      .select('*')
      .gte('collection_date', startDate)
      .lte('collection_date', endDate)
      .order('collection_date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching collections by date range:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in getCollectionsByDateRange:', error);
    throw error;
  }
}

/**
 * Get collections by collector
 */
export async function getCollectionsByCollector(collectorId: string): Promise<CollectionWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('collection_details')
      .select('*')
      .eq('collector_id', collectorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching collections by collector:', error);
      throw error;
    }

    const rows = (data || []) as any[];
    const name = rows.find(r => r.collector_name && String(r.collector_name).trim() !== '')?.collector_name;
    if (!name) {
      const { data: userRow } = await supabase
        .from('users')
        .select('full_name, first_name, last_name, email')
        .eq('id', collectorId)
        .maybeSingle();
      const fullName = (userRow?.full_name && String(userRow.full_name).trim())
        || `${userRow?.first_name || ''} ${userRow?.last_name || ''}`.trim()
        || userRow?.email
        || 'Unassigned';
      return rows.map(r => ({ ...r, collector_name: r.collector_name || fullName }) as CollectionWithDetails);
    }
    return rows as CollectionWithDetails[];
  } catch (error) {
    console.error('❌ Error in getCollectionsByCollector:', error);
    throw error;
  }
}

/**
 * Get collections by resident
 */
export async function getCollectionsByResident(residentId: string): Promise<CollectionWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('collection_details')
      .select('*')
      .eq('resident_id', residentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching collections by resident:', error);
      throw error;
    }

    const rows = (data || []) as any[];
    const missingNameIds = Array.from(new Set(
      rows
        .filter(r => (!r.collector_name || String(r.collector_name).trim() === '') && r.collector_id)
        .map(r => r.collector_id)
    ));
    const idToName = new Map<string, string>();
    if (missingNameIds.length > 0) {
      const { data: collectors } = await supabase
        .from('users')
        .select('id, full_name, first_name, last_name, email')
        .in('id', missingNameIds);
      (collectors || []).forEach((u: any) => {
        const fullName = (u.full_name && String(u.full_name).trim())
          || `${u.first_name || ''} ${u.last_name || ''}`.trim()
          || u.email
          || 'Unassigned';
        idToName.set(String(u.id), fullName);
      });
    }
    return rows.map(r => (!r.collector_name || String(r.collector_name).trim() === '')
      ? ({ ...r, collector_name: idToName.get(String(r.collector_id)) || 'Unassigned' } as CollectionWithDetails)
      : (r as CollectionWithDetails));
  } catch (error) {
    console.error('❌ Error in getCollectionsByResident:', error);
    throw error;
  }
}
