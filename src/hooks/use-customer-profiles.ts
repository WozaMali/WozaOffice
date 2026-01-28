import { useState, useEffect } from 'react';
import { profileServices } from '@/lib/supabase-services';
import type { ProfileWithAddresses } from '@/lib/supabase';

export function useCustomerProfiles() {
  const [customers, setCustomers] = useState<ProfileWithAddresses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await profileServices.getCustomerProfilesWithAddresses();
        setCustomers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch customers');
        console.error('Error fetching customer profiles:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const refreshCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await profileServices.getCustomerProfilesWithAddresses();
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh customers');
      console.error('Error refreshing customer profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    customers,
    isLoading,
    error,
    refreshCustomers
  };
}
