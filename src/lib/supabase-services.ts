import { supabase } from './supabase'
import { realtimeManager } from './realtimeManager'
import type { 
  Profile, 
  Address, 
  UserAddress,
  Material, 
  Pickup, 
  PickupItem, 
  PickupPhoto, 
  Payment,
  PickupWithDetails,
  PickupItemWithMaterial,
  ProfileWithAddresses,
  MemberWithUserAddresses,
  CustomerDashboardView,
  CollectorDashboardView,
  AdminDashboardView,
  SystemImpactView,
  MaterialPerformanceView,
  CollectorPerformanceView,
  CustomerPerformanceView
} from './supabase'

// Profile Services
export const profileServices = {
  // Get profile by ID
  async getProfile(profileId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  },

  // Get profile by email
  async getProfileByEmail(email: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching profile by email:', error)
      return null
    }
  },

  // Create or update profile
  async upsertProfile(profile: Partial<Profile>): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profile)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error upserting profile:', error)
      return null
    }
  },

  // Get profiles by role
  async getProfilesByRole(role: Profile['role']): Promise<Profile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', role)
        .eq('is_active', true)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching profiles by role:', error)
      return []
    }
  },

  // Get customer profiles with their addresses for collector dashboard (legacy)
  async getCustomerProfilesWithAddresses(): Promise<ProfileWithAddresses[]> {
    try {
      // Use the same approach as Main App Dashboard - direct fields from users table
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          email,
          township_id,
          street_addr,
          subdivision,
          city,
          postal_code,
          created_at,
          areas!township_id(name)
        `)
        .eq('role_id', (await this.getRoleId('customer')))
        .eq('is_active', true)

      if (error) throw error
      
      // Transform to match ProfileWithAddresses interface
      return data?.map(user => ({
        id: user.id,
        full_name: `${user.first_name} ${user.last_name}`.trim(),
        phone: user.phone,
        email: user.email,
        role: 'customer',
        is_active: true,
        created_at: user.created_at,
        // Create address object from direct fields (same as Main App Dashboard)
        addresses: [{
          id: user.id, // Use user id as address id for compatibility
          profile_id: user.id,
          line1: user.street_addr || '',
          suburb: user.subdivision || '',
          city: user.city || '',
          postal_code: user.postal_code || '',
          is_primary: true,
          created_at: user.created_at
        }]
      })) || []
    } catch (error) {
      console.error('Error fetching customer profiles with addresses:', error)
      return []
    }
  },

  // Helper method to get role ID
  async getRoleId(roleName: string): Promise<string> {
    const { data, error } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single()
    
    if (error) throw error
    return data.id
  },

  // NEW: Get member profiles with user addresses using the same approach as Main App
  async getMemberProfilesWithUserAddresses(): Promise<MemberWithUserAddresses[]> {
    try {
      console.log('🔍 Fetching member profiles with user addresses...')
      
      // Use the same approach as Main App Dashboard - direct fields from users table
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          email,
          township_id,
          street_addr,
          subdivision,
          city,
          postal_code,
          created_at,
          areas!township_id(name)
        `)
        .eq('role_id', (await this.getRoleId('member')))
        .eq('is_active', true)
        .order('first_name', { ascending: true })

      if (error) {
        console.error('❌ Supabase error:', error)
        throw error
      }
      
      console.log('📊 Raw data from users table:', { 
        count: data?.length || 0, 
        sample: data?.slice(0, 2) 
      })
      
      // Transform to match MemberWithUserAddresses interface
      return data?.map(user => ({
        id: user.id,
        email: user.email,
        full_name: `${user.first_name} ${user.last_name}`.trim(),
        phone: user.phone,
        role: 'customer',
        is_active: true,
        created_at: user.created_at,
        // Create user addresses from direct fields (same as Main App Dashboard)
        user_addresses: [{
          id: user.id, // Use user id as address id for compatibility
          user_id: user.id,
          address_type: 'primary',
          address_line1: user.street_addr || '',
          address_line2: user.subdivision || '',
          city: user.city || '',
          province: 'Gauteng', // Default province
          postal_code: user.postal_code || '',
          country: 'South Africa',
          is_default: true,
          is_active: true,
          created_at: user.created_at,
          updated_at: user.created_at
        }]
      })) || []
    } catch (error) {
      console.error('❌ Error fetching member profiles with user addresses:', error)
      return []
    }
  },

  // Legacy method for backward compatibility
  async getMemberProfilesWithUserAddressesLegacy(): Promise<MemberWithUserAddresses[]> {
    try {
      console.log('🔍 Fetching member profiles with user addresses (legacy view)...')
      
      const { data, error } = await supabase
        .from('office_member_user_addresses_view')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) {
        console.error('❌ Supabase error:', error)
        throw error
      }
      
      console.log('📊 Raw data from view:', { 
        count: data?.length || 0, 
        sample: data?.slice(0, 2) 
      })
      
      // Transform the data to group addresses by member
      const memberMap = new Map<string, MemberWithUserAddresses>()
      
      data?.forEach((row: any) => {
        const memberId = row.member_id
        
        if (!memberMap.has(memberId)) {
          // Create member record
          memberMap.set(memberId, {
            id: row.member_id,
            email: row.email,
            full_name: row.full_name,
            phone: row.phone,
            role: row.role,
            is_active: row.member_is_active,
            created_at: row.member_since,
            user_addresses: [],
            wallet_balance: row.wallet_balance,
            total_points: row.total_points,
            tier: row.tier,
            total_pickups: row.total_pickups,
            last_pickup_date: row.last_pickup_date
          })
        }
        
        // Add address to member
        const member = memberMap.get(memberId)!
        if (row.address_id) {
          member.user_addresses!.push({
            id: row.address_id,
            user_id: row.member_id,
            address_type: row.address_type,
            address_line1: row.address_line1,
            address_line2: row.address_line2,
            city: row.city,
            province: row.province,
            postal_code: row.postal_code,
            country: row.country,
            coordinates: row.coordinates,
            is_default: row.is_default,
            is_active: row.address_is_active,
            notes: row.notes,
            created_at: row.address_created,
            updated_at: row.address_updated
          })
        }
      })
      
      const result = Array.from(memberMap.values())
      console.log('✅ Transformed data:', { 
        memberCount: result.length, 
        sample: result.slice(0, 1) 
      })
      
      return result
    } catch (error) {
      console.error('❌ Error fetching member profiles with user addresses:', error)
      return []
    }
  },

  // Get member profiles for collection app
  async getCollectionMemberProfiles(): Promise<MemberWithUserAddresses[]> {
    try {
      const { data, error } = await supabase
        .from('collection_member_user_addresses_view')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching collection member profiles:', error)
      return []
    }
  },

  // Get member profiles for office app
  async getOfficeMemberProfiles(): Promise<MemberWithUserAddresses[]> {
    try {
      const { data, error } = await supabase
        .from('office_member_user_addresses_view')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching office member profiles:', error)
      return []
    }
  }
}

// Address Services
export const addressServices = {
  // Get addresses for a profile (legacy)
  async getAddressesByProfile(profileId: string): Promise<Address[]> {
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('profile_id', profileId)
        .order('is_primary', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching addresses:', error)
      return []
    }
  },

  // Create new address (legacy)
  async createAddress(address: Omit<Address, 'id'>): Promise<Address | null> {
    try {
      const { data, error } = await supabase
        .from('addresses')
        .insert([address])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating address:', error)
      return null
    }
  },

  // Update address (legacy)
  async updateAddress(addressId: string, updates: Partial<Address>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('addresses')
        .update(updates)
        .eq('id', addressId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating address:', error)
      return false
    }
  },

  // NEW: User Address Services
  // Get user addresses using the new schema
  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('address_type', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching user addresses:', error)
      return []
    }
  },

  // Create new user address
  async createUserAddress(address: Omit<UserAddress, 'id' | 'created_at' | 'updated_at'>): Promise<UserAddress | null> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .insert([address])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating user address:', error)
      return null
    }
  },

  // Update user address
  async updateUserAddress(addressId: string, updates: Partial<UserAddress>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_addresses')
        .update(updates)
        .eq('id', addressId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating user address:', error)
      return false
    }
  },

  // Set default address for a user
  async setDefaultAddress(userId: string, addressId: string, addressType: string): Promise<boolean> {
    try {
      // First, remove default from other addresses of the same type
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('address_type', addressType)
        .neq('id', addressId)

      // Then set the new default
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error setting default address:', error)
      return false
    }
  },

  // Get default address for a user
  async getDefaultAddress(userId: string, addressType?: string): Promise<UserAddress | null> {
    try {
      let query = supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .eq('is_active', true)

      if (addressType) {
        query = query.eq('address_type', addressType)
      }

      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      return data || null
    } catch (error) {
      console.error('Error fetching default address:', error)
      return null
    }
  }
}

// Material Services
export const materialServices = {
  // Get all active materials
  async getActiveMaterials(): Promise<Material[]> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching materials:', error)
      return []
    }
  },

  // Get material by ID
  async getMaterial(materialId: string): Promise<Material | null> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', materialId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching material:', error)
      return null
    }
  }
}

// Pickup Services
export const pickupServices = {
  // Create a new pickup
  async createPickup(pickupData: Omit<Pickup, 'id' | 'started_at'>): Promise<Pickup | null> {
    try {
      // Handle both old and new address schema
      const insertData: any = {
        ...pickupData,
        started_at: new Date().toISOString(),
        status: 'submitted'
      }

      // If pickup_address_id is provided, use it; otherwise use address_id
      if (pickupData.pickup_address_id) {
        insertData.pickup_address_id = pickupData.pickup_address_id
        // Don't include address_id if using new schema
        delete insertData.address_id
      }

      const { data, error } = await supabase
        .from('pickups')
        .insert([insertData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating pickup:', error)
      return null
    }
  },

  // Get pickup with full details
  async getPickupWithDetails(pickupId: string): Promise<PickupWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select(`
          *,
          customer:profiles!pickups_customer_id_fkey(*),
          collector:profiles!pickups_collector_id_fkey(*),
          address:addresses(*),
          pickup_address:user_addresses!pickups_pickup_address_id_fkey(*),
          items:pickup_items(*),
          photos:pickup_photos(*),
          payment:payments(*)
        `)
        .eq('id', pickupId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching pickup with details:', error)
      return null
    }
  },

  // Get pickups by customer
  async getPickupsByCustomer(customerId: string): Promise<Pickup[]> {
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select('*')
        .eq('customer_id', customerId)
        .order('started_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching customer pickups:', error)
      return []
    }
  },

  // Get pickups by collector
  async getPickupsByCollector(collectorId: string): Promise<Pickup[]> {
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select('*')
        .eq('collector_id', collectorId)
        .order('started_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching collector pickups:', error)
      return []
    }
  },

  // Update pickup status
  async updatePickupStatus(pickupId: string, status: Pickup['status'], approvalNote?: string): Promise<boolean> {
    try {
      const updateData: any = { status }
      if (approvalNote) updateData.approval_note = approvalNote

      const { error } = await supabase
        .from('pickups')
        .update(updateData)
        .eq('id', pickupId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating pickup status:', error)
      return false
    }
  },

  // Submit pickup (set submitted_at)
  async submitPickup(pickupId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pickups')
        .update({ submitted_at: new Date().toISOString() })
        .eq('id', pickupId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error submitting pickup:', error)
      return false
    }
  },

  // Update pickup payment status
  async updatePickupPaymentStatus(pickupId: string, paymentStatus: 'pending' | 'paid' | 'failed', paymentMethod?: string): Promise<boolean> {
    try {
      const updateData: any = { payment_status: paymentStatus }
      if (paymentMethod) updateData.payment_method = paymentMethod

      const { error } = await supabase
        .from('pickups')
        .update(updateData)
        .eq('id', pickupId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating pickup payment status:', error)
      return false
    }
  }
}

// Pickup Item Services
export const pickupItemServices = {
  // Add items to a pickup
  async addPickupItems(pickupId: string, items: Omit<PickupItem, 'id'>[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pickup_items')
        .insert(items.map(item => ({ ...item, pickup_id: pickupId })))

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error adding pickup items:', error)
      return false
    }
  },

  // Get items for a pickup with material details
  async getPickupItemsWithMaterials(pickupId: string): Promise<PickupItemWithMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('pickup_items')
        .select(`
          *,
          material:materials(*)
        `)
        .eq('pickup_id', pickupId)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching pickup items:', error)
      return []
    }
  }
}

// Pickup Photo Services
export const pickupPhotoServices = {
  // Add photos to a pickup
  async addPickupPhotos(pickupId: string, photos: Omit<PickupPhoto, 'id' | 'pickup_id' | 'taken_at'>[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pickup_photos')
        .insert(photos.map(photo => ({
          ...photo,
          pickup_id: pickupId,
          taken_at: new Date().toISOString()
        })))

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error adding pickup photos:', error)
      return false
    }
  },

  // Get photos for a pickup
  async getPickupPhotos(pickupId: string): Promise<PickupPhoto[]> {
    try {
      const { data, error } = await supabase
        .from('pickup_photos')
        .select('*')
        .eq('pickup_id', pickupId)
        .order('taken_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching pickup photos:', error)
      return []
    }
  }
}

// Payment Services
export const paymentServices = {
  // Create payment for a pickup
  async createPayment(paymentData: Omit<Payment, 'id'>): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating payment:', error)
      return null
    }
  },

  // Update payment status
  async updatePaymentStatus(paymentId: string, status: Payment['status'], method?: string): Promise<boolean> {
    try {
      const updateData: any = { status }
      if (method) updateData.method = method
      if (status === 'approved') updateData.processed_at = new Date().toISOString()

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating payment status:', error)
      return false
    }
  },

  // Get payment by pickup ID
  async getPaymentByPickup(pickupId: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('pickup_id', pickupId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching payment:', error)
      return null
    }
  }
}

// Dashboard Services - NEW! Using the installed schema views
export const dashboardServices = {
  // Get collector dashboard data
  async getCollectorDashboard(): Promise<CollectorDashboardView[]> {
    try {
      const { data, error } = await supabase
        .from('collector_dashboard_view')
        .select('*')
        .order('started_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching collector dashboard:', error)
      return []
    }
  },

  // Get customer dashboard data
  async getCustomerDashboard(): Promise<CustomerDashboardView[]> {
    try {
      const { data, error } = await supabase
        .from('customer_dashboard_view')
        .select('*')
        .order('total_kg_recycled', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching customer dashboard:', error)
      return []
    }
  },

  // Get admin dashboard data
  async getAdminDashboard(): Promise<AdminDashboardView[]> {
    try {
      const { data, error } = await supabase
        .from('admin_dashboard_view')
        .select('*')
        .order('started_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching admin dashboard:', error)
      return []
    }
  }
}

// Analytics Services - NEW! Using the installed schema views
export const analyticsServices = {
  // Get system impact overview
  async getSystemImpact(): Promise<SystemImpactView | null> {
    try {
      const { data, error } = await supabase
        .from('system_impact_view')
        .select('*')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching system impact:', error)
      return null
    }
  },

  // Get material performance analytics
  async getMaterialPerformance(): Promise<MaterialPerformanceView[]> {
    try {
      const { data, error } = await supabase
        .from('material_performance_view')
        .select('*')
        .order('total_kg_collected', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching material performance:', error)
      return []
    }
  },

  // Get collector performance analytics
  async getCollectorPerformance(): Promise<CollectorPerformanceView[]> {
    try {
      const { data, error } = await supabase
        .from('collector_performance_view')
        .select('*')
        .order('total_kg_collected', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching collector performance:', error)
      return []
    }
  },

}

// Customer Services
export const customerServices = {
  // Get customer profile
  async getCustomerProfile(profileId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching customer profile:', error)
      return null
    }
  },

  // Get customer dashboard data
  async getCustomerDashboard(): Promise<CustomerDashboardView[]> {
    try {
      const { data, error } = await supabase
        .from('customer_dashboard_view')
        .select('*')
        .order('total_kg_recycled', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching customer dashboard:', error)
      return []
    }
  },

  // Get customer performance analytics
  async getCustomerPerformance(): Promise<CustomerPerformanceView[]> {
    try {
      const { data, error } = await supabase
        .from('customer_performance_view')
        .select('*')
        .order('total_kg_recycled', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching customer performance:', error)
      return []
    }
  }
}

// Admin Services
export const adminServices = {
  // Get submitted pickups
  async getSubmittedPickups(): Promise<Pickup[]> {
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select('*')
        .eq('status', 'submitted')
        .order('started_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching submitted pickups:', error)
      return []
    }
  },

  // Get pending pickups (alias for submitted)
  async getPendingPickups(): Promise<Pickup[]> {
    return this.getSubmittedPickups();
  },

  // Get approved pickups
  async getApprovedPickups(): Promise<Pickup[]> {
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select('*')
        .eq('status', 'approved')
        .order('started_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching approved pickups:', error)
      return []
    }
  },

  // Get completed pickups (alias for approved)
  async getCompletedPickups(): Promise<Pickup[]> {
    return this.getApprovedPickups();
  },

  // Get rejected pickups
  async getRejectedPickups(): Promise<Pickup[]> {
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select('*')
        .eq('status', 'rejected')
        .order('started_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching rejected pickups:', error)
      return []
    }
  },

  // Approve pickup
  async approvePickup(pickupId: string, approvalNote?: string): Promise<boolean> {
    return pickupServices.updatePickupStatus(pickupId, 'approved', approvalNote)
  },

  // Reject pickup
  async rejectPickup(pickupId: string, approvalNote: string): Promise<boolean> {
    return pickupServices.updatePickupStatus(pickupId, 'rejected', approvalNote)
  }
}

// Realtime Services
export const realtimeServices = {
  // Subscribe to pickup updates
  subscribeToPickups(callback: (payload: any) => void) {
    realtimeManager.subscribe('pickup_updates', (channel) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'pickups' }, callback)
    })
    return () => realtimeManager.unsubscribe('pickup_updates')
  },

  // Subscribe to payment updates
  subscribeToPayments(callback: (payload: any) => void) {
    realtimeManager.subscribe('payment_updates', (channel) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, callback)
    })
    return () => realtimeManager.unsubscribe('payment_updates')
  }
}

// Enhanced Pickup Management Services
export const enhancedPickupServices = {
  // Compute totals for a pickup using the new function
  async computePickupTotals(pickupId: string) {
    try {
      const { data, error } = await supabase
        .rpc('compute_pickup_totals', { p_pickup_id: pickupId })

      if (error) throw error
      return data?.[0] || null
    } catch (error) {
      console.error('Error computing pickup totals:', error)
      return null
    }
  },

  // Finalize a pickup (collector function)
  async finalizePickup(pickupId: string) {
    try {
      const { data, error } = await supabase
        .rpc('finalize_pickup', { p_pickup_id: pickupId })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error finalizing pickup:', error)
      return null
    }
  },

  // Approve a pickup (admin function)
  async approvePickup(pickupId: string, adminId: string) {
    try {
      const { data, error } = await supabase
        .rpc('approve_pickup', { 
          p_pickup_id: pickupId, 
          p_admin_id: adminId 
        })

      if (error) throw error
      return data?.[0] || null
    } catch (error) {
      console.error('Error approving pickup:', error)
      return null
    }
  }
}
