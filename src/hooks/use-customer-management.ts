import { useState, useEffect, useCallback } from 'react';
import { profileServices } from '@/lib/supabase-services';
import type { ProfileWithAddresses } from '@/lib/supabase';

interface CustomerStatistics {
  total: number;
  withAddresses: number;
  withoutAddresses: number;
  readyForFirstCollection: number;
  activeCustomers: number;
  inactiveCustomers: number;
}

interface SearchParams {
  search_term?: string;
  role?: string;
  is_active?: boolean;
  has_address?: boolean;
}

export function useCustomerManagement() {
  const [customers, setCustomers] = useState<ProfileWithAddresses[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<ProfileWithAddresses[]>([]);
  const [statistics, setStatistics] = useState<CustomerStatistics>({
    total: 0,
    withAddresses: 0,
    withoutAddresses: 0,
    readyForFirstCollection: 0,
    activeCustomers: 0,
    inactiveCustomers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get all customer profiles with addresses
  const getCustomerProfilesWithAddresses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await profileServices.getCustomerProfilesWithAddresses();
      setCustomers(data);
      setFilteredCustomers(data);
      
      // Calculate statistics
      calculateStatistics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
      console.error('Error fetching customer profiles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search customers with various filters
  const searchCustomers = useCallback((params: SearchParams) => {
    let filtered = [...customers];

    if (params.search_term) {
      const searchTerm = params.search_term.toLowerCase();
      filtered = filtered.filter(customer => {
        const fullName = (customer.full_name || '').trim().toLowerCase();
        return fullName.includes(searchTerm) ||
          customer.email.toLowerCase().includes(searchTerm) ||
          customer.addresses?.some(addr => 
            addr.line1.toLowerCase().includes(searchTerm) ||
            addr.suburb.toLowerCase().includes(searchTerm) ||
            addr.city.toLowerCase().includes(searchTerm)
          );
      });
    }

    if (params.role) {
      filtered = filtered.filter(customer => customer.role === params.role);
    }

    if (params.is_active !== undefined) {
      filtered = filtered.filter(customer => customer.is_active === params.is_active);
    }

    if (params.has_address !== undefined) {
      if (params.has_address) {
        filtered = filtered.filter(customer => customer.addresses && customer.addresses.length > 0);
      } else {
        filtered = filtered.filter(customer => !customer.addresses || customer.addresses.length === 0);
      }
    }

    setFilteredCustomers(filtered);
  }, [customers]);

  // Get customers by address status
  const getCustomersByAddressStatus = useCallback((hasAddress: boolean) => {
    if (hasAddress) {
      return customers.filter(customer => customer.addresses && customer.addresses.length > 0);
    } else {
      return customers.filter(customer => !customer.addresses || customer.addresses.length === 0);
    }
  }, [customers]);

  // Get customers ready for first collection (have addresses but no pickups)
  const getCustomersReadyForFirstCollection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get customers with addresses
      const customersWithAddresses = customers.filter(
        customer => customer.addresses && customer.addresses.length > 0
      );
      
      // Filter to only show customers who haven't had pickups yet
      // This would need to be enhanced with actual pickup data comparison
      const readyCustomers = customersWithAddresses.filter(customer => 
        customer.is_active && (customer.role?.toLowerCase?.() === 'customer')
      );
      
      setFilteredCustomers(readyCustomers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get ready customers');
      console.error('Error getting ready customers:', err);
    } finally {
      setLoading(false);
    }
  }, [customers]);

  // Calculate customer statistics
  const calculateStatistics = useCallback((customerData: ProfileWithAddresses[]) => {
    const stats: CustomerStatistics = {
      total: customerData.length,
      withAddresses: customerData.filter(c => c.addresses && c.addresses.length > 0).length,
      withoutAddresses: customerData.filter(c => !c.addresses || c.addresses.length === 0).length,
      readyForFirstCollection: customerData.filter(c => 
        c.is_active && 
        (c.role?.toLowerCase?.() === 'customer') && 
        c.addresses && 
        c.addresses.length > 0
      ).length,
      activeCustomers: customerData.filter(c => c.is_active).length,
      inactiveCustomers: customerData.filter(c => !c.is_active).length
    };
    
    setStatistics(stats);
  }, []);

  // Refresh customers data
  const refreshCustomers = useCallback(async () => {
    await getCustomerProfilesWithAddresses();
  }, [getCustomerProfilesWithAddresses]);

  // Initialize on mount
  useEffect(() => {
    getCustomerProfilesWithAddresses();
  }, [getCustomerProfilesWithAddresses]);

  return {
    customers,
    filteredCustomers,
    statistics,
    loading,
    error,
    getCustomerProfilesWithAddresses,
    searchCustomers,
    getCustomersByAddressStatus,
    getCustomersReadyForFirstCollection,
    refreshCustomers
  };
}
