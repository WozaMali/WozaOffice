import { supabase } from './supabase';

export interface Customer {
  id: string;
  profile_id: string;
  name: string;
  surname: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  suburb: string;
  city: string;
  postal_code?: string;
  is_active: boolean;
  created_at: string;
}

export interface CustomerSearchResult {
  id: string;
  profile_id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  suburb: string;
  city: string;
  postal_code?: string;
}

// Search customers by address (partial match)
export async function searchCustomersByAddress(address: string): Promise<CustomerSearchResult[]> {
  try {
    console.log('🔍 Searching customers by address:', address);
    
    if (!address.trim()) {
      return [];
    }

    // Try the nested select approach first (should work now that foreign key is fixed)
    try {
      console.log('🔄 Attempting nested select approach...');
      const { data, error } = await supabase
        .from('addresses')
        .select(`
          id,
          profile_id,
          line1,
          suburb,
          city,
          postal_code,
          profiles:profiles!inner(
            id,
            full_name,
            phone,
            email,
            is_active
          )
        `)
        .or(`line1.ilike.%${address}%,suburb.ilike.%${address}%,city.ilike.%${address}%`)
        .eq('profiles.is_active', true)
        .limit(20);

      if (error) {
        console.log('⚠️ Nested select failed, falling back to manual join:', error);
        throw error;
      }

      // Transform the data to match our interface
      const customers: CustomerSearchResult[] = data?.map((item: any) => ({
        id: item.id,
        profile_id: item.profile_id,
        full_name: (Array.isArray(item.profiles) ? item.profiles[0]?.full_name : item.profiles?.full_name) || 'Unknown',
        phone: (Array.isArray(item.profiles) ? item.profiles[0]?.phone : item.profiles?.phone) || '',
        email: (Array.isArray(item.profiles) ? item.profiles[0]?.email : item.profiles?.email) || '',
        address: `${item.line1}, ${item.suburb}, ${item.city}`,
        suburb: item.suburb,
        city: item.city,
        postal_code: item.postal_code,
      })) || [];

      console.log('✅ Found customers using nested select:', customers.length);
      return customers;
    } catch (nestedError) {
      console.log('🔄 Using fallback manual join approach...');
      
      // Fallback: Use separate queries and combine manually
      const { data: addresses, error: addressesError } = await supabase
        .from('addresses')
        .select('id, profile_id, line1, suburb, city, postal_code')
        .or(`line1.ilike.%${address}%,suburb.ilike.%${address}%,city.ilike.%${address}%`)
        .limit(50);

      if (addressesError) {
        console.error('❌ Error fetching addresses:', addressesError);
        throw addressesError;
      }

      if (!addresses || addresses.length === 0) {
        console.log('⚠️ No addresses found matching search term');
        return [];
      }

      // Get unique profile IDs from the addresses (without using Set spread)
      const profileIds = addresses
        .map(addr => addr.profile_id)
        .filter((id, index, arr) => arr.indexOf(id) === index);

      // Fetch profiles for these IDs (only if we have profile IDs)
      let profiles: any[] = [];
      let profilesError: any = null;
      
      if (profileIds.length > 0) {
        const { data: profilesData, error: profilesErrorData } = await supabase
          .from('users')
          .select('id, first_name, last_name, phone, email, is_active')
          .in('id', profileIds)
          .eq('role_id', (await getRoleId('customer')))
          .eq('is_active', true);
        
        profiles = profilesData || [];
        profilesError = profilesErrorData;
      }

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Create a map of profile data for quick lookup
      const profileMap = new Map(profiles?.map(p => [p.id, {
        id: p.id,
        full_name: `${p.first_name} ${p.last_name}`.trim(),
        phone: p.phone,
        email: p.email,
        is_active: p.is_active
      }]) || []);

      // Combine addresses with profile data
      const customers: CustomerSearchResult[] = addresses
        .filter(addr => profileMap.has(addr.profile_id))
        .map(addr => {
          const profile = profileMap.get(addr.profile_id)!;
          return {
            id: addr.id,
            profile_id: addr.profile_id,
            full_name: profile.full_name || 'Unknown',
            phone: profile.phone || '',
            email: profile.email || '',
            address: `${addr.line1}, ${addr.suburb}, ${addr.city}`,
            suburb: addr.suburb,
            city: addr.city,
            postal_code: addr.postal_code,
          };
        });

      console.log('✅ Found customers using fallback approach:', customers.length);
      return customers;
    }
  } catch (error) {
    console.error('❌ Error in searchCustomersByAddress:', error);
    throw error;
  }
}

// Enhanced search function that can find customers by multiple criteria
// Helper method to get role ID
async function getRoleId(roleName: string): Promise<string> {
  const { data, error } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single()
  
  if (error) throw error
  return data.id
}

export async function searchCustomersComprehensive(searchTerm: string): Promise<CustomerSearchResult[]> {
  try {
    console.log('🔍 Comprehensive customer search:', searchTerm);
    
    if (!searchTerm.trim()) {
      return [];
    }

    // Search in profiles table first (by name, email, phone)
    const { data: profilesByName, error: profilesError } = await supabase
      .from('users')
      .select('id, full_name, phone, email, status')
      .eq('role_id', 'member') // Use member role for customers
      .eq('status', 'active')
      .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(20);

    if (profilesError) {
      console.error('❌ Error searching profiles:', profilesError);
      throw profilesError;
    }

    // Search in addresses table
    const { data: addresses, error: addressesError } = await supabase
      .from('addresses')
      .select('id, profile_id, line1, suburb, city, postal_code')
      .or(`line1.ilike.%${searchTerm}%,suburb.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
      .limit(30);

    if (addressesError) {
      console.error('❌ Error searching addresses:', addressesError);
      throw addressesError;
    }

    // Combine results
    const allProfileIds = new Set([
      ...(profilesByName?.map(p => p.id) || []),
      ...(addresses?.map(a => a.profile_id) || [])
    ]);

    // Fetch all relevant profiles (only if we have profile IDs)
    let allProfiles: any[] = [];
    let allProfilesError: any = null;
    
    if (allProfileIds.size > 0) {
      const { data: allProfilesData, error: allProfilesErrorData } = await supabase
        .from('users')
        .select('id, full_name, phone, email, status')
        .in('id', Array.from(allProfileIds))
        .eq('role_id', 'member') // Use member role for customers
        .eq('status', 'active');
      
      allProfiles = allProfilesData || [];
      allProfilesError = allProfilesErrorData;
    }

    if (allProfilesError) {
      console.error('❌ Error fetching all profiles:', allProfilesError);
      throw allProfilesError;
    }

    // Create profile map
    const profileMap = new Map(allProfiles?.map(p => [p.id, p]) || []);

    // Build results
    const results: CustomerSearchResult[] = [];

    // Add results from name/email/phone search
    profilesByName?.forEach(profile => {
      results.push({
        id: profile.id,
        profile_id: profile.id,
        full_name: profile.full_name || 'Unknown',
        phone: profile.phone || '',
        email: profile.email || '',
        address: 'Address not specified',
        suburb: '',
        city: '',
        postal_code: '',
      });
    });

    // Add results from address search
    addresses?.forEach(addr => {
      const profile = profileMap.get(addr.profile_id);
      if (profile && !results.find(r => r.profile_id === addr.profile_id)) {
        results.push({
          id: addr.id,
          profile_id: addr.profile_id,
          full_name: profile.full_name || 'Unknown',
          phone: profile.phone || '',
          email: profile.email || '',
          address: `${addr.line1}, ${addr.suburb}, ${addr.city}`,
          suburb: addr.suburb,
          city: addr.city,
          postal_code: addr.postal_code,
        });
      }
    });

    // Remove duplicates and limit results
    const uniqueResults = results.filter((result, index, self) => 
      index === self.findIndex(r => r.profile_id === result.profile_id)
    ).slice(0, 20);

    console.log('✅ Comprehensive search found customers:', uniqueResults.length);
    return uniqueResults;
  } catch (error) {
    console.error('❌ Error in comprehensive search:', error);
    throw error;
  }
}

// Get customer by ID with full details
export async function getCustomerById(customerId: string): Promise<Customer | null> {
  try {
    console.log('🔍 Getting customer by ID:', customerId);
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        role_id,
        status,
        created_at,
        user_addresses!inner(
          id,
          line1,
          suburb,
          city,
          postal_code,
          is_primary
        )
      `)
      .eq('id', customerId)
      .eq('role_id', 'member') // Use member role for customers
      .eq('status', 'active')
      .single();

    if (error) {
      console.error('❌ Error getting customer:', error);
      throw error;
    }

    if (!data) {
      console.log('⚠️ Customer not found');
      return null;
    }

    // Get primary address
    const primaryAddress = data.user_addresses?.find(addr => addr.is_primary) || data.user_addresses?.[0];
    
    const customer: Customer = {
      id: data.id,
      profile_id: data.id,
      name: data.full_name?.split(' ')[0] || '',
      surname: data.full_name?.split(' ').slice(1).join(' ') || '',
      full_name: data.full_name || '',
      phone: data.phone || '',
      email: data.email,
      address: primaryAddress ? `${primaryAddress.line1}, ${primaryAddress.suburb}, ${primaryAddress.city}` : '',
      suburb: primaryAddress?.suburb || '',
      city: primaryAddress?.city || '',
      postal_code: primaryAddress?.postal_code,
      is_active: data.status === 'active',
      created_at: data.created_at,
    };

    console.log('✅ Customer retrieved:', customer.full_name);
    return customer;
  } catch (error) {
    console.error('❌ Error in getCustomerById:', error);
    throw error;
  }
}

// Get all active customers
export async function getAllActiveCustomers(): Promise<Customer[]> {
  try {
    console.log('🔍 Getting all active customers');
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        role_id,
        status,
        created_at,
        user_addresses(
          id,
          line1,
          suburb,
          city,
          postal_code,
          is_primary
        )
      `)
      .eq('role_id', 'member') // Use member role for customers
      .eq('status', 'active')
      .order('full_name');

    if (error) {
      console.error('❌ Error getting customers:', error);
      throw error;
    }

    const customers: Customer[] = data?.map(profile => {
      const primaryAddress = profile.user_addresses?.find(addr => addr.is_primary) || profile.user_addresses?.[0];
      
      return {
        id: profile.id,
        profile_id: profile.id,
        name: profile.full_name?.split(' ')[0] || '',
        surname: profile.full_name?.split(' ').slice(1).join(' ') || '',
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        email: profile.email,
        address: primaryAddress ? `${primaryAddress.line1}, ${primaryAddress.suburb}, ${primaryAddress.city}` : '',
        suburb: primaryAddress?.suburb || '',
        city: primaryAddress?.city || '',
        postal_code: primaryAddress?.postal_code,
        is_active: profile.status === 'active',
        created_at: profile.created_at,
      };
    }) || [];

    console.log('✅ Retrieved customers:', customers.length);
    return customers;
  } catch (error) {
    console.error('❌ Error in getAllActiveCustomers:', error);
    throw error;
  }
}

// Subscribe to customer changes for real-time updates
export function subscribeToCustomerChanges(callback: (payload: any) => void) {
  return supabase
    .channel('customer_changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'profiles' 
    }, (payload) => {
      console.log('🔄 Customer change detected:', payload);
      callback(payload);
    })
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'addresses' 
    }, (payload) => {
      console.log('🔄 Address change detected:', payload);
      callback(payload);
    })
    .subscribe();
}
