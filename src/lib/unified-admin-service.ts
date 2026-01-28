import { supabase } from './supabase';
import type { 
  User, 
  UserWithRole,
  UserComplete,
  Role, 
  Area, 
  Resident,
  TownshipDropdown,
  SubdivisionDropdown,
  Material
} from './supabase';

// ============================================================================
// UNIFIED ADMIN SERVICE
// ============================================================================
// This service handles all admin operations using the unified schema

export interface AdminDashboardData {
  totalUsers: number;
  totalResidents: number;
  totalCollectors: number;
  totalAdmins: number;
  totalCollections: number;
  totalWeight: number;
  totalRevenue: number;
  pendingCollections: number;
  approvedCollections: number;
  rejectedCollections: number;
  totalWallets: number;
  totalWalletBalance: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
}

export interface CollectionData {
  id: string;
  user_id: string;
  collector_id: string;
  pickup_address_id: string;
  material_type: string;
  material_rate_per_kg?: number;
  computed_value?: number;
  weight_kg: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    email: string;
    phone?: string;
  };
  collector?: {
    id: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    email: string;
    phone?: string;
  };
  pickup_address?: {
    id: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    province?: string;
    postal_code?: string;
  };
}

export interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

export class UnifiedAdminService {
  // ============================================================================
  // DASHBOARD DATA
  // ============================================================================
  static async getDashboardData(): Promise<{ data: AdminDashboardData | null; error: any }> {
    try {
      // Load all data in parallel for maximum speed
      const [userCountResult, collectionsResult, rolesResult, walletsResult] = await Promise.allSettled([
        // User counts - use count queries to avoid 1000-row limit
        (async () => {
          try {
            // Get total users count
            const totalResult = await supabase.from('users').select('id', { count: 'exact', head: true });
            // Get active users count
            let activeResult = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active');
            if (activeResult.error) {
              // Fallback to profiles
              activeResult = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true);
            }
            // Get role breakdown using count queries (much faster than fetching all)
            // Note: role might be in role_id or role field, we'll try both
            const [residentResult, collectorResult, adminResult] = await Promise.allSettled([
              (async () => {
                try {
                  const result = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('role', 'resident');
                  return result.count || 0;
                } catch {
                  try {
                    // Try with role_id if role field doesn't work
                    const result = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active');
                    // If we can't filter by role, we'll estimate based on total
                    return 0;
                  } catch {
                    return 0;
                  }
                }
              })(),
              (async () => {
                try {
                  const result = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('role', 'collector');
                  return result.count || 0;
                } catch {
                  return 0;
                }
              })(),
              (async () => {
                try {
                  const result = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('role', 'admin');
                  return result.count || 0;
                } catch {
                  return 0;
                }
              })()
            ]);
            
            return {
              total: totalResult.count || 0,
              active: activeResult.count || 0,
              residents: residentResult.status === 'fulfilled' ? residentResult.value : 0,
              collectors: collectorResult.status === 'fulfilled' ? collectorResult.value : 0,
              admins: adminResult.status === 'fulfilled' ? adminResult.value : 0
            };
          } catch {
            return { total: 0, active: 0, residents: 0, collectors: 0, admins: 0 };
          }
        })(),
        // Collections data
        (async () => {
          try {
            const result = await supabase.from('unified_collections').select('id, status, weight_kg, total_weight_kg, computed_value, total_value');
            if (result.error) throw result.error;
            return result.data || [];
          } catch {
            return [];
          }
        })(),
        // Roles mapping (non-blocking, can fail)
        (async () => {
          try {
            const result = await supabase.from('roles').select('id, name');
            return result.data || [];
          } catch {
            return [];
          }
        })(),
        // Wallet data (non-blocking, can fail)
        (async () => {
          try {
            const result = await supabase.from('user_wallets').select('current_points, total_points_earned, total_points_spent');
            if (result.error && (result.error.code === 'PGRST205' || result.error.message?.includes("Could not find the table 'public.user_wallets'"))) {
              const fallback = await supabase.from('wallets').select('balance, total_points');
              return fallback.data || [];
            }
            if (result.error) throw result.error;
            return result.data || [];
          } catch {
            return [];
          }
        })()
      ]);

      const userCounts = userCountResult.status === 'fulfilled' ? userCountResult.value : { total: 0, active: 0, residents: 0, collectors: 0, admins: 0 };
      const collections = collectionsResult.status === 'fulfilled' ? collectionsResult.value : [];
      const roles = rolesResult.status === 'fulfilled' ? rolesResult.value : [];
      const wallets = walletsResult.status === 'fulfilled' ? walletsResult.value : [];
      
      // Extract counts from the count query result
      const totalResidents = userCounts.residents || 0;
      const totalCollectors = userCounts.collectors || 0;
      const totalAdmins = userCounts.admins || 0;

      const totalCollections = collections?.length || 0;
      const totalWeight = collections?.reduce((sum: number, c: any) => sum + (Number(c.weight_kg ?? c.total_weight_kg ?? 0)), 0) || 0;
      const pendingCollections = collections?.filter((c: any) => c.status === 'pending' || c.status === 'submitted').length || 0;
      const approvedCollections = collections?.filter((c: any) => c.status === 'approved').length || 0;
      const rejectedCollections = collections?.filter((c: any) => c.status === 'rejected').length || 0;
      
      // Compute revenue from collections data we already have (no extra query needed)
      const revenueStatuses = new Set(['approved', 'completed']);
      const computedRevenue = collections
        .filter((c: any) => revenueStatuses.has(c.status))
        .reduce((sum: number, c: any) => sum + (Number(c.computed_value ?? c.total_value ?? 0)), 0);

      const totalWallets = wallets.length;
      // Calculate actual wallet balance from wallets (not from weight)
      const totalWalletBalance = wallets.reduce((sum: number, w: any) => sum + (w.current_points ?? w.balance ?? 0), 0) || 0;
      const totalPointsEarned = wallets.reduce((sum: number, w: any) => sum + (w.total_points_earned ?? w.total_points ?? 0), 0) || 0;
      const totalPointsSpent = wallets.reduce((sum: number, w: any) => sum + (w.total_points_spent ?? 0), 0) || 0;

      const dashboardData: AdminDashboardData = {
        totalUsers: userCounts.total || 0,
        totalResidents,
        totalCollectors,
        totalAdmins,
        totalCollections,
        totalWeight,
        totalRevenue: computedRevenue,
        pendingCollections,
        approvedCollections,
        rejectedCollections,
        totalWallets,
        totalWalletBalance,
        totalPointsEarned,
        totalPointsSpent
      };

      return { data: dashboardData, error: null };
    } catch (error) {
      console.error('Error in getDashboardData:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // USERS MANAGEMENT
  // ============================================================================
  static async getAllUsers(): Promise<{ data: UserComplete[] | null; error: any }> {
    try {
      // Fetch all users in pages to bypass the 1000-row default cap
      const pageSize = 1000;
      let page = 0;
      let allRows: any[] = [];

      while (true) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
          .from('users')
          .select(`
            *,
            role:roles(*)
          `)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) {
          console.error('Error fetching users:', error);
          return { data: null, error };
        }

        const rows = data || [];
        allRows = allRows.concat(rows);

        if (rows.length < pageSize) break; // last page
        page += 1;

        // safety guard to prevent accidental runaway
        if (page > 200) {
          console.warn('⚠️ Aborting users pagination after 200k rows for safety');
          break;
        }
      }

      return { data: allRows as any, error: null };
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return { data: null, error };
    }
  }

  static async getUsersByRole(roleName: string): Promise<{ data: User[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('role.name', roleName)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users by role:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getUsersByRole:', error);
      return { data: null, error };
    }
  }

  static async createUser(userData: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    role_name: string;
    township_id?: string;
    subdivision?: string;
    street_addr?: string;
    city?: string;
    postal_code?: string;
  }): Promise<{ data: User | null; error: any }> {
    try {
      // Get role ID
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', userData.role_name)
        .single();

      if (roleError || !role) {
        console.error('Error getting role:', roleError);
        return { data: null, error: roleError };
      }

      // Create user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          id: crypto.randomUUID(),
          first_name: userData.first_name,
          last_name: userData.last_name,
          full_name: `${userData.first_name} ${userData.last_name}`,
          email: userData.email,
          phone: userData.phone,
          role_id: role.id,
          township_id: userData.township_id,
          subdivision: userData.subdivision,
          street_addr: userData.street_addr,
          city: userData.city || 'Soweto',
          postal_code: userData.postal_code,
          status: 'active'
        })
        .select(`
          *,
          role:roles(*),
          area:areas(*)
        `)
        .single();

      if (userError) {
        console.error('Error creating user:', userError);
        return { data: null, error: userError };
      }

      return { data: newUser, error: null };
    } catch (error) {
      console.error('Error in createUser:', error);
      return { data: null, error };
    }
  }

  static async updateUser(userId: string, updateData: Partial<User>): Promise<{ data: User | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select(`
          *,
          role:roles(*),
          area:areas(*)
        `)
        .single();

      if (error) {
        console.error('Error updating user:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in updateUser:', error);
      return { data: null, error };
    }
  }

  static async deleteUser(userId: string): Promise<{ data: boolean | null; error: any }> {
    try {
      // Check if user has collections (unified only)
      const { data: collections, error: collectionsError } = await supabase
        .from('unified_collections')
        .select('id')
        .or(`customer_id.eq.${userId},collector_id.eq.${userId}`)
        .limit(1);

      if (collectionsError) {
        console.error('Error checking collections:', collectionsError);
        return { data: null, error: collectionsError };
      }

      if (collections && collections.length > 0) {
        return { data: null, error: new Error('Cannot delete user with existing collections') };
      }

      // Delete user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        return { data: null, error };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Error in deleteUser:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // COLLECTIONS MANAGEMENT
  // ============================================================================
  static async getAllCollections(): Promise<{ data: CollectionData[] | null; error: any }> {
    try {
      // Simplified fast query - use denormalized data from unified_collections
      // This avoids complex joins and multiple queries that cause timeouts
      console.log('🔄 getAllCollections: Starting simplified fetch...');
      
      // Optimized query - fetch only essential fields first, then transform
      // This reduces the amount of data transferred and speeds up the query
      const queryPromise = supabase
        .from('unified_collections')
        .select(`
          id,
          customer_id,
          collector_id,
          pickup_address_id,
          total_weight_kg,
          total_value,
          status,
          customer_notes,
          collector_notes,
          admin_notes,
          created_at,
          updated_at,
          customer_name,
          customer_email,
          customer_phone,
          collector_name,
          collector_email,
          collector_phone,
          pickup_address
        `)
        .order('created_at', { ascending: false })
        .limit(1000); // Increased limit but query should still be fast with proper indexing
      
      // Execute query directly - Supabase has its own timeout handling
      // Remove the race condition timeout as it may be causing premature failures
      const startTime = Date.now();
      const baseResp = await queryPromise;
      const queryTime = Date.now() - startTime;
      console.log(`⏱️ Query executed in ${queryTime}ms`);

      if (baseResp.error) {
        console.error('❌ Error fetching collections:', baseResp.error);
        return { data: null, error: baseResp.error };
      }

      const rows = (baseResp.data as any[]) || [];
      console.log(`✅ getAllCollections: Fetched ${rows.length} collections`);
      
      if (rows.length === 0) return { data: [], error: null };

      // Transform to CollectionData format using denormalized data (no additional queries needed)
      const collections: CollectionData[] = rows.map(r => {
        const kg = (typeof r.total_weight_kg === 'number' ? r.total_weight_kg : 0) || 0;
        const computedValue = typeof r.total_value === 'number' ? r.total_value : 0;
        const materialRate = kg > 0 && computedValue > 0 ? computedValue / kg : 0;
        // Combine all notes into a single notes field
        const notes = [r.customer_notes, r.collector_notes, r.admin_notes].filter(Boolean).join('\n') || undefined;

        return {
          id: r.id,
          user_id: r.customer_id, // Use customer_id as user_id for compatibility
          collector_id: r.collector_id,
          pickup_address_id: r.pickup_address_id,
          material_type: 'Mixed', // unified_collections doesn't have material_type, use default
          material_rate_per_kg: materialRate,
          computed_value: computedValue,
          weight_kg: kg,
          status: r.status,
          notes: notes,
          created_at: r.created_at,
          updated_at: r.updated_at,
          customer: r.customer_id ? {
            id: r.customer_id,
            first_name: undefined,
            last_name: undefined,
            full_name: r.customer_name || '',
            email: r.customer_email || '',
            phone: r.customer_phone || undefined
          } : null,
          collector: r.collector_id ? {
            id: r.collector_id,
            first_name: undefined,
            last_name: undefined,
            full_name: r.collector_name || 'Unassigned',
            email: r.collector_email || '',
            phone: r.collector_phone || undefined
          } : null,
          pickup_address: r.pickup_address ? {
            id: r.pickup_address_id,
            address_line1: r.pickup_address,
            address_line2: '',
            city: '',
            province: '',
            postal_code: ''
          } : null
        } as CollectionData;
      });

      console.log(`✅ getAllCollections: Transformed ${collections.length} collections`);
      return { data: collections, error: null };
    } catch (error) {
      console.error('Error in getAllCollections:', error);
      return { data: null, error };
    }
  }

  static async updateCollectionStatus(collectionId: string, status: string, notes?: string): Promise<{ data: CollectionData | null; error: any }> {
    try {
      // Use RPCs for approved/rejected to ensure wallet/fund/points post atomically
      if (status === 'approved' || status === 'rejected') {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !authData?.user?.id) {
          console.error('Error getting current user for approver_id:', authErr);
          return { data: null, error: authErr || new Error('Not authenticated') };
        }

        if (status === 'approved') {
          const { error: rpcErr } = await supabase.rpc('approve_collection', {
            p_collection_id: collectionId,
            p_approver_id: authData.user.id,
            p_note: notes ?? null,
            p_idempotency_key: null
          });
          // Treat only populated errors as blocking; some environments return an empty object
          if (rpcErr && (rpcErr as any).message) {
            console.error('Error approving collection via RPC:', rpcErr);
            // Fallback: directly mark approved to ensure decision is saved
            const direct = await supabase
              .from('unified_collections')
              .update({ status: 'approved', admin_notes: notes, updated_at: new Date().toISOString() })
              .eq('id', collectionId)
              .select('*')
              .maybeSingle();
            if (direct.error) {
              // Try legacy collections as last resort
              const legacy = await supabase
                .from('collections')
                .update({ status: 'approved', notes, updated_at: new Date().toISOString() })
                .eq('id', collectionId)
                .select('*')
                .maybeSingle();
              if (legacy.error) return { data: null, error: rpcErr };
            }
          }

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
          if (rpcErr && (rpcErr as any).message) {
            console.error('Error rejecting collection via RPC:', rpcErr);
            // Fallback: directly mark rejected to ensure decision is saved
            const direct = await supabase
              .from('unified_collections')
              .update({ status: 'rejected', admin_notes: notes, updated_at: new Date().toISOString() })
              .eq('id', collectionId)
              .select('*')
              .maybeSingle();
            if (direct.error) {
              const legacy = await supabase
                .from('collections')
                .update({ status: 'rejected', notes, updated_at: new Date().toISOString() })
                .eq('id', collectionId)
                .select('*')
                .maybeSingle();
              if (legacy.error) return { data: null, error: rpcErr };
            }
          }
        }

        // Fetch the updated row to return (prefer unified_collections)
        let fetchErr: any = null;
        let row: any = null;
        const resp = await supabase
          .from('unified_collections')
          .select('*')
          .eq('id', collectionId)
          .maybeSingle();
        if (resp.error || !resp.data) {
          const legacy = await supabase
          .from('collections')
          .select('*')
          .eq('id', collectionId)
            .maybeSingle();
          fetchErr = legacy.error;
          row = legacy.data;
        } else {
          row = resp.data;
        }
        if (!row && fetchErr) {
          console.error('Error fetching collection after RPC:', fetchErr);
          return { data: null, error: fetchErr };
        }
        return { data: row as any, error: null };
      }

      // Non-approval status updates fall back to direct update on unified_collections
      const { data, error } = await supabase
        .from('unified_collections')
        .update({
          status,
          admin_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating collection status:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in updateCollectionStatus:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // TOWNSHIPS & SUBDIVISIONS
  // ============================================================================
  static async getTownships(): Promise<{ data: TownshipDropdown[] | null; error: any }> {
    try {
      // Use the same source as Main App and constrain to Soweto
      const { data, error } = await supabase
        .from('address_townships')
        .select('id, township_name, city, postal_code')
        .ilike('city', '%soweto%')
        .order('township_name');

      if (error) {
        console.error('Error fetching townships:', error);
        return { data: null, error };
      }

      // Ensure a generic name field exists for UI convenience
      const mapped = (data || []).map((t: any) => ({
        ...t,
        name: t.township_name
      }));

      return { data: mapped as any, error: null };
    } catch (error) {
      console.error('Error in getTownships:', error);
      return { data: null, error };
    }
  }

  static async getSubdivisions(townshipId: string): Promise<{ data: SubdivisionDropdown[] | null; error: any }> {
    try {
      // Use the same source as Main App
      const { data, error } = await supabase
        .from('address_subdivisions')
        .select('subdivision, area_id')
        .eq('area_id', townshipId)
        .order('subdivision');

      if (error) {
        console.error('Error fetching subdivisions:', error);
        // Fallback: legacy subdivisions table
        const { data: legacy, error: legacyErr } = await supabase
          .from('address_subdivisions')
          .select('subdivision, area_id')
          .eq('area_id', townshipId)
          .order('subdivision');
        if (!legacyErr) {
          const mapped = (legacy || []).map((r: any) => ({
            area_id: String(r.area_id),
            subdivision: String(r.subdivision),
            township_name: '',
            postal_code: ''
          })) as SubdivisionDropdown[];
          return { data: mapped, error: null };
        }
        return { data: null, error: legacyErr || error };
      }

      const mapped = (data || []).map((r: any) => ({
        area_id: String(r.area_id),
        subdivision: String(r.subdivision),
        township_name: '',
        postal_code: ''
      })) as SubdivisionDropdown[];
      return { data: mapped, error: null };
    } catch (error) {
      console.error('Error in getSubdivisions:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // MATERIALS
  // ============================================================================
  static async getMaterials(): Promise<{ data: Material[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching materials:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getMaterials:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // RECENT ACTIVITY
  // ============================================================================
  static async getRecentActivity(limit: number = 20): Promise<{ data: RecentActivity[] | null; error: any }> {
    try {
      const activities: RecentActivity[] = [];

      // Get recent collections
      const { data: recentCollections, error: collectionsError } = await supabase
        .from('collections')
        .select('id, status, created_at, updated_at, user_id')
        .order('created_at', { ascending: false })
        .limit(10);

      if (collectionsError) {
        console.error('Error fetching recent collections:', collectionsError);
      } else if (recentCollections) {
        // Get customer names
        const customerIds = recentCollections.map(c => c.user_id).filter(Boolean);
        const { data: customers } = customerIds.length > 0 ? await supabase
          .from('users')
          .select('id, first_name, last_name, full_name')
          .in('id', customerIds) : { data: [] };

        recentCollections.forEach(collection => {
          const customer = customers?.find(c => c.id === collection.user_id);
          const customerName = customer?.full_name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Customer';
          
          if (collection.status === 'pending' || collection.status === 'submitted') {
            activities.push({
              id: collection.id,
              type: 'collection_created',
              title: 'New Collection Submitted',
              description: `${customerName} - Collection ${collection.id} submitted`,
              timestamp: collection.created_at,
              metadata: { collection_id: collection.id, customer_name: customerName }
            });
          } else if (collection.status === 'approved') {
            activities.push({
              id: collection.id,
              type: 'collection_approved',
              title: 'Collection Approved',
              description: `${customerName} - Collection ${collection.id} approved`,
              timestamp: collection.updated_at || collection.created_at,
              metadata: { collection_id: collection.id, customer_name: customerName }
            });
          } else if (collection.status === 'rejected') {
            activities.push({
              id: collection.id,
              type: 'collection_rejected',
              title: 'Collection Rejected',
              description: `${customerName} - Collection ${collection.id} rejected`,
              timestamp: collection.updated_at || collection.created_at,
              metadata: { collection_id: collection.id, customer_name: customerName }
            });
          }
        });
      }

      // Get recent user registrations
      const { data: recentUsers, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, full_name, role_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (usersError) {
        console.error('Error fetching recent users:', usersError);
      } else if (recentUsers) {
        // Get role names
        const roleIds = recentUsers.map(u => u.role_id).filter(Boolean);
        const { data: roles } = roleIds.length > 0 ? await supabase
          .from('roles')
          .select('id, name')
          .in('id', roleIds) : { data: [] };

        recentUsers.forEach(user => {
          const role = roles?.find(r => r.id === user.role_id);
          const userName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
          
          activities.push({
            id: user.id,
            type: 'user_registered',
            title: 'New User Registered',
            description: `${userName} (${role?.name || 'Unknown Role'})`,
            timestamp: user.created_at,
            metadata: { user_id: user.id, user_name: userName, role: role?.name }
          });
        });
      }

      // Sort by timestamp and limit
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      return { data: sortedActivities, error: null };
    } catch (error) {
      console.error('Error in getRecentActivity:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // WALLET DATA
  // ============================================================================
  static async getWalletData(): Promise<{ data: any | null; error: any }> {
    try {
      // Try unified table then fallback to legacy wallets
      let walletsResp = await supabase
        .from('user_wallets')
        .select('*')
        .order('current_points', { ascending: false });
      if (walletsResp.error && (walletsResp.error.code === 'PGRST205' || walletsResp.error.message?.includes("Could not find the table 'public.user_wallets'"))) {
        console.warn('⚠️ user_wallets not found, falling back to wallets');
        walletsResp = await supabase
          .from('wallets')
          .select('*')
          .order('balance', { ascending: false });
      }
      if (walletsResp.error) {
        console.error('Error fetching wallet data:', walletsResp.error);
        return { data: null, error: walletsResp.error };
      }

      const wallets = walletsResp.data as any[] || [];
      const totalWallets = wallets.length;
      const totalWalletBalance = wallets.reduce((sum: number, w: any) => sum + (w.current_points ?? w.balance ?? 0), 0) || 0;
      const totalPointsEarned = wallets.reduce((sum: number, w: any) => sum + (w.total_points_earned ?? w.total_points ?? 0), 0) || 0;
      const totalPointsSpent = wallets.reduce((sum: number, w: any) => sum + (w.total_points_spent ?? 0), 0) || 0;

      return {
        data: {
          wallets: wallets || [],
          totalWallets,
          totalWalletBalance,
          totalPointsEarned,
          totalPointsSpent,
          totalLifetimeEarnings: totalPointsEarned
        },
        error: null
      };
    } catch (error) {
      console.error('Error in getWalletData:', error);
      return { data: null, error };
    }
  }
}

// ============================================================================
// HOOKS FOR REACT COMPONENTS
// ============================================================================

import { useState, useEffect } from 'react';

export function useDashboardData() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await UnifiedAdminService.getDashboardData();

      if (error) {
        setError(error);
      } else {
        setData(data);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

export function useAllUsers() {
  const [users, setUsers] = useState<UserComplete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await UnifiedAdminService.getAllUsers();

      if (error) {
        setError(error);
      } else {
        setUsers(data || []);
      }

      setLoading(false);
    };

    fetchUsers();
  }, []);

  return { users, loading, error };
}

export function useCollections() {
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const fetchCollections = async () => {
      setError(null);
      setLoading(true);
      
      // Set a timeout to prevent infinite loading (60 seconds for large datasets)
      // Increased timeout to allow for slow database queries
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('⚠️ Collections fetch timeout, showing empty state');
          setLoading(false);
          setCollections([]);
          setError({ message: 'Collections fetch timed out. Please refresh the page.' });
        }
      }, 60000);
      
      try {
        // Load in background with timeout protection
        // Don't add an additional timeout race - let the query handle its own timeout
        // The UI timeout (30s) will handle the overall timeout
        const startTime = Date.now();
        const { data, error } = await UnifiedAdminService.getAllCollections();
        const elapsed = Date.now() - startTime;
        console.log(`⏱️ Collections fetch completed in ${elapsed}ms`);

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!isMounted) return;

        if (error) {
          console.error('❌ Collections fetch error:', error);
          setError(error);
          setLoading(false);
          setCollections([]);
        } else {
          console.log('✅ Collections loaded:', data?.length || 0);
          setCollections(data || []);
          setLoading(false);
        }
      } catch (err) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (!isMounted) return;
        console.error('❌ Collections fetch exception:', err);
        setError(err);
        setLoading(false);
        setCollections([]);
      }
    };

    fetchCollections();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return { collections, loading, error };
}

export function useTownships() {
  const [townships, setTownships] = useState<TownshipDropdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchTownships = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await UnifiedAdminService.getTownships();

      if (error) {
        setError(error);
      } else {
        setTownships(data || []);
      }

      setLoading(false);
    };

    fetchTownships();
  }, []);

  return { townships, loading, error };
}

export function useSubdivisions(townshipId: string | null) {
  const [subdivisions, setSubdivisions] = useState<SubdivisionDropdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!townshipId) {
      setSubdivisions([]);
      return;
    }

    const fetchSubdivisions = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await UnifiedAdminService.getSubdivisions(townshipId);

      if (error) {
        setError(error);
      } else {
        setSubdivisions(data || []);
      }

      setLoading(false);
    };

    fetchSubdivisions();
  }, [townshipId]);

  return { subdivisions, loading, error };
}
