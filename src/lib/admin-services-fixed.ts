import { supabase } from './supabase';
import { 
  Profile, 
  Pickup, 
  Payment, 
  Material,
  AdminDashboardView,
  SystemImpactView,
  MaterialPerformanceView,
  CollectorPerformanceView,
  CustomerPerformanceView
} from './supabase';

// Custom interface for transformed pickup data with nested properties
export interface TransformedPickup extends Pickup {
  customer?: {
    full_name: string;
    email: string;
    phone?: string;
  } | null;
  collector?: {
    full_name: string;
    email: string;
    phone?: string;
  } | null;
  address?: {
    line1: string;
    suburb: string;
    city: string;
    postal_code: string;
  } | null;
  pickup_items?: Array<{
    id: string;
    kilograms: number;
    contamination_pct: number;
    material?: {
      id: string;
      name: string;
      rate_per_kg: number;
    };
  }>;
  // Calculated totals from pickup_items
  total_kg: number;
  total_value: number;
}

// Real-time subscription types
export type RealtimeCallback<T> = (payload: { new: T; old: T; eventType: string }) => void;

// ============================================================================
// TEST CONNECTION
// ============================================================================

export async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...');
  console.log('🔗 URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('🔑 Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not Set');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection test failed:', error);
      return { success: false, error };
    }
    
    console.log('✅ Connection test successful');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Connection test exception:', error);
    return { success: false, error };
  }
}

// ============================================================================
// USERS MANAGEMENT
// ============================================================================

export async function getUsers(): Promise<Profile[]> {
  console.log('🔍 Fetching users from Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        roles!role_id(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users:', error);
      throw error;
    }
    
    console.log('✅ Users fetched successfully:', data?.length || 0, 'users found');
    if (data && data.length > 0) {
      console.log('📋 Sample user data:', data[0]);
    }
    
    // Transform unified users data to Profile format for compatibility
    const profiles = data?.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No Name',
      phone: user.phone,
      role: user.roles?.name || user.role_id || 'member',
      is_active: user.status === 'active',
      created_at: user.created_at,
      updated_at: user.updated_at
    })) || [];
    
    return profiles;
  } catch (error) {
    console.error('❌ Exception in getUsers:', error);
    throw error;
  }
}

export function subscribeToUsers(callback: RealtimeCallback<Profile>) {
  return supabase
    .channel('users_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
      callback({ new: payload.new as Profile, old: payload.old as Profile, eventType: payload.eventType });
    })
    .subscribe();
}

export async function updateUserRole(userId: string, role: string, isActive: boolean) {
  const { error } = await supabase
    .from('users')
    .update({ role_id: role, status: isActive ? 'active' : 'suspended' })
    .eq('id', userId);

  if (error) throw error;
}

// ============================================================================
// PICKUPS MANAGEMENT
// ============================================================================

export async function getPickups(): Promise<TransformedPickup[]> {
  console.log('🔍 Fetching pickups from Supabase...');
  
  try {
    // Fetch pickups with pickup items and materials for accurate totals
    const { data: pickupsData, error } = await supabase
      .from('pickups')
      .select(`
        *,
        pickup_items (
          id,
          kilograms,
          contamination_pct,
          material: materials (
            id,
            name,
            rate_per_kg
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching pickups:', error);
      throw error;
    }

    // Fetch customer profiles separately (using user_id instead of customer_id)
    const customerIds = Array.from(new Set(pickupsData?.map(p => p.user_id).filter(Boolean) || []));
    const { data: customerProfiles } = await supabase
      .from('users')
      .select('id, full_name, email, phone')
      .in('id', customerIds);

    // Fetch collector profiles separately (using collector_id if it exists, otherwise null)
    const collectorIds = Array.from(new Set(pickupsData?.map(p => p.collector_id).filter(Boolean) || []));
    const { data: collectorProfiles } = await supabase
      .from('users')
      .select('id, full_name, email, phone')
      .in('id', collectorIds);

    // Fetch addresses separately
    const addressIds = Array.from(new Set(pickupsData?.map(p => p.address_id).filter(Boolean) || []));
    const { data: addresses } = await supabase
      .from('addresses')
      .select('id, line1, suburb, city, postal_code')
      .in('id', addressIds);

    // Transform the data and calculate totals
    const transformedPickups = (pickupsData || []).map(pickup => {
      const customer = customerProfiles?.find(p => p.id === pickup.user_id);
      const collector = collectorProfiles?.find(p => p.id === pickup.collector_id);
      const address = addresses?.find(a => a.id === pickup.address_id);

      // Calculate totals from pickup items
      const pickupItems = pickup.pickup_items || [];
      const totalKg = pickupItems.reduce((sum: number, item: any) => sum + (item.kilograms || 0), 0);
      const totalValue = pickupItems.reduce((sum: number, item: any) => {
        const rate = item.material?.rate_per_kg || 0;
        return sum + ((item.kilograms || 0) * rate);
      }, 0);

      return {
        ...pickup,
        total_kg: totalKg,
        total_value: totalValue,
        customer: customer ? {
          full_name: customer.full_name || 'Unknown',
          email: customer.email,
          phone: customer.phone
        } : null,
        collector: collector ? {
          full_name: collector.full_name || 'Unassigned',
          email: collector.email,
          phone: collector.phone
        } : null,
        address: address ? {
          line1: address.line1,
          suburb: address.suburb,
          city: address.city,
          postal_code: address.postal_code
        } : null
      };
    });

    console.log('✅ Pickups fetched successfully:', transformedPickups.length, 'pickups found');
    console.log('📊 Sample pickup data:', transformedPickups[0]);
    return transformedPickups;
  } catch (error) {
    console.error('❌ Exception in getPickups:', error);
    throw error;
  }
}

export function subscribeToPickups(callback: RealtimeCallback<Pickup>) {
  return supabase
    .channel('pickups_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pickups' }, (payload) => {
      callback({ new: payload.new as Pickup, old: payload.old as Pickup, eventType: payload.eventType });
    })
    .subscribe();
}

export async function updatePickupStatus(pickupId: string, status: string, approvalNote?: string) {
  console.log(`🔄 Updating pickup ${pickupId} status to: ${status}`);
  
  try {
    const { data, error } = await supabase
      .from('pickups')
      .update({ 
        status, 
        approval_note: approvalNote,
        updated_at: new Date().toISOString()
      })
      .eq('id', pickupId)
      .select('*, customer:profiles!pickups_user_id_fkey(id, full_name, email)')
      .single();

    if (error) {
      console.error('❌ Error updating pickup status:', error);
      throw error;
    }

    console.log(`✅ Pickup status updated successfully:`, {
      pickupId,
      newStatus: status,
      customer: data.customer?.full_name || 'Unknown',
      customerEmail: data.customer?.email || 'No email'
    });

    // The real-time subscription will automatically notify all connected clients
    // including the customer dashboard running on the other repository
    console.log('📡 Real-time update sent to all connected clients (admin, customer, collector dashboards)');

    return data;
  } catch (error) {
    console.error('❌ Exception in updatePickupStatus:', error);
    throw error;
  }
}

// ============================================================================
// PAYMENTS & WITHDRAWALS
// ============================================================================

export async function getPayments(): Promise<Payment[]> {
  console.log('🔍 Fetching payments from Supabase...');
  
  try {
    // Fetch payments with simple query
    const { data: paymentsData, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching payments:', error);
      throw error;
    }

    // Fetch pickup details separately (note: pickups don't have total_kg/total_value columns)
    const pickupIds = Array.from(new Set(paymentsData?.map(p => p.pickup_id).filter(Boolean) || []));
    const { data: pickups } = await supabase
      .from('pickups')
      .select('id, user_id')
      .in('id', pickupIds);

    // Fetch customer profiles for the pickups (using user_id instead of customer_id)
    const customerIds = Array.from(new Set(pickups?.map(p => p.user_id).filter(Boolean) || []));
    const { data: customerProfiles } = await supabase
      .from('users')
      .select('id, full_name, email, phone')
      .in('id', customerIds);

    // Transform the data
    const transformedPayments = (paymentsData || []).map(payment => {
      const pickup = pickups?.find(p => p.id === payment.pickup_id);
      const customer = customerProfiles?.find(p => p.id === pickup?.user_id);

      return {
        ...payment,
        pickup: pickup ? {
          customer: customer ? {
            full_name: customer.full_name || 'Unknown',
            email: customer.email,
            phone: customer.phone
          } : null,
          // Note: total_kg and total_value are calculated from pickup_items, not stored in pickups table
          total_kg: 0, // This would need to be calculated separately if needed
          total_value: 0 // This would need to be calculated separately if needed
        } : null
      };
    });

    console.log('✅ Payments fetched successfully:', transformedPayments.length, 'payments found');
    return transformedPayments;
  } catch (error) {
    console.error('❌ Exception in getPayments:', error);
    throw error;
  }
}

export function subscribeToPayments(callback: RealtimeCallback<Payment>) {
  return supabase
    .channel('payments_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, (payload) => {
      callback({ new: payload.new as Payment, old: payload.old as Payment, eventType: payload.eventType });
    })
    .subscribe();
}

export async function updatePaymentStatus(paymentId: string, status: string, adminNotes?: string) {
  const { error } = await supabase
    .from('payments')
    .update({ 
      status, 
      admin_notes: adminNotes,
      processed_at: status === 'approved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentId);

  if (error) throw error;
}

// ============================================================================
// MATERIALS & PRICING
// ============================================================================

export async function getMaterials(): Promise<Material[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export function subscribeToMaterials(callback: RealtimeCallback<Material>) {
  return supabase
    .channel('materials_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, (payload) => {
      callback({ new: payload.new as Material, old: payload.old as Material, eventType: payload.eventType });
    })
    .subscribe();
}

export async function updateMaterialPricing(materialId: string, ratePerKg: number) {
  const { error } = await supabase
    .from('materials')
    .update({ rate_per_kg: ratePerKg })
    .eq('id', materialId);

  if (error) throw error;
}

// ============================================================================
// ANALYTICS & DASHBOARD DATA
// ============================================================================

export async function getSystemImpact(): Promise<SystemImpactView> {
  const { data, error } = await supabase
    .from('system_impact_view')
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function getMaterialPerformance(): Promise<MaterialPerformanceView[]> {
  const { data, error } = await supabase
    .from('material_performance_view')
    .select('*')
    .order('total_kg', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCollectorPerformance(): Promise<CollectorPerformanceView[]> {
  const { data, error } = await supabase
    .from('collector_performance_view')
    .select('*')
    .order('total_pickups', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCustomerPerformance(): Promise<CustomerPerformanceView[]> {
  const { data, error } = await supabase
    .from('customer_performance_view')
    .select('*')
    .order('total_kg', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

export async function getRecentActivity(limit: number = 20) {
  console.log('🔍 Fetching recent activity...');
  
  try {
    const activities: any[] = [];

    // Get recent pickups
    const { data: recentPickups, error: pickupsError } = await supabase
      .from('pickups')
      .select('id, status, created_at, updated_at, user_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (pickupsError) {
      console.error('❌ Error fetching recent pickups:', pickupsError);
    } else if (recentPickups) {
      // Fetch customer names for the pickups
      const customerIds = Array.from(new Set(recentPickups.map(p => p.user_id).filter(Boolean)));
      const { data: customerProfiles } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', customerIds);

      recentPickups.forEach(pickup => {
        const customer = customerProfiles?.find(p => p.id === pickup.user_id);
        if (pickup.status === 'submitted') {
          activities.push({
            id: pickup.id,
            type: 'pickup_created',
            title: 'New Pickup Submitted',
            description: `${customer?.full_name || 'Customer'} - Pickup submitted`,
            timestamp: pickup.created_at,
            metadata: { pickup_id: pickup.id, customer: customer }
          });
        } else if (pickup.status === 'approved') {
          activities.push({
            id: pickup.id,
            type: 'pickup_approved',
            title: 'Pickup Approved',
            description: `${customer?.full_name || 'Customer'} - Pickup approved`,
            timestamp: pickup.updated_at || pickup.created_at,
            metadata: { pickup_id: pickup.id, customer: customer }
          });
        } else if (pickup.status === 'rejected') {
          activities.push({
            id: pickup.id,
            type: 'pickup_rejected',
            title: 'Pickup Rejected',
            description: `${customer?.full_name || 'Customer'} - Pickup rejected`,
            timestamp: pickup.updated_at || pickup.created_at,
            metadata: { pickup_id: pickup.id, customer: customer }
          });
        }
      });
    }

    // Get recent user registrations
    const { data: recentUsers, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching recent users:', usersError);
    } else if (recentUsers) {
      recentUsers.forEach(user => {
        activities.push({
          id: user.id,
          type: 'user_registered',
          title: 'New User Registered',
          description: `${user.full_name || 'User'} (${user.role})`,
          timestamp: user.created_at,
          metadata: { user_id: user.id, user_name: user.full_name, role: user.role }
        });
      });
    }

    // Sort all activities by timestamp and take the most recent ones
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    console.log('✅ Recent activity fetched successfully:', sortedActivities.length, 'activities found');
    return sortedActivities;
    
  } catch (error) {
    console.error('❌ Exception in getRecentActivity:', error);
    throw error;
  }
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

export function subscribeToAllChanges(callbacks: {
  users?: RealtimeCallback<Profile>;
  pickups?: RealtimeCallback<Pickup>;
  payments?: RealtimeCallback<Payment>;
  materials?: RealtimeCallback<Material>;
}) {
  const channels = [];

  if (callbacks.users) {
    channels.push(subscribeToUsers(callbacks.users));
  }
  if (callbacks.pickups) {
    channels.push(subscribeToPickups(callbacks.pickups));
  }
  if (callbacks.payments) {
    channels.push(subscribeToPayments(callbacks.payments));
  }
  if (callbacks.materials) {
    channels.push(subscribeToMaterials(callbacks.materials));
  }

  return channels;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatCurrency(amount: number): string {
  const value = Number.isFinite(amount as any) ? Number(amount) : 0
  return `C ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  return `${kg.toFixed(1)}kg`;
}
