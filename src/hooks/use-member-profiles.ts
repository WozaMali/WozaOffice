import { useState, useEffect, useCallback } from 'react';
import { profileServices, addressServices } from '@/lib/supabase-services';
import type { MemberWithUserAddresses, UserAddress } from '@/lib/supabase';

interface MemberStatistics {
  total: number;
  withAddresses: number;
  withoutAddresses: number;
  withPickupAddresses: number;
  withMultipleAddresses: number;
  activeMembers: number;
  inactiveMembers: number;
}

interface SearchParams {
  searchTerm?: string;
  addressType?: 'primary' | 'secondary' | 'pickup' | 'billing';
  hasAddress?: boolean;
  is_active?: boolean;
}

export function useMemberProfiles() {
  const [members, setMembers] = useState<MemberWithUserAddresses[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberWithUserAddresses[]>([]);
  const [statistics, setStatistics] = useState<MemberStatistics>({
    total: 0,
    withAddresses: 0,
    withoutAddresses: 0,
    withPickupAddresses: 0,
    withMultipleAddresses: 0,
    activeMembers: 0,
    inactiveMembers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get all member profiles with user addresses
  const getMemberProfilesWithUserAddresses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Hook: Fetching member profiles...');
      const data = await profileServices.getMemberProfilesWithUserAddresses();
      console.log('📊 Hook: Received data:', { 
        count: data.length, 
        sample: data.slice(0, 1) 
      });
      
      setMembers(data);
      setFilteredMembers(data);
      
      // Calculate statistics
      calculateStatistics(data);
      console.log('✅ Hook: Data processed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch members';
      setError(errorMessage);
      console.error('❌ Hook: Error fetching member profiles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search and filter members
  const searchMembers = useCallback((params: SearchParams) => {
    let filtered = [...members];

    // Search by name or email
    if (params.searchTerm) {
      const searchLower = params.searchTerm.toLowerCase();
      filtered = filtered.filter(member => 
        member.full_name?.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        member.phone?.includes(searchLower)
      );
    }

    // Filter by address type
    if (params.addressType) {
      filtered = filtered.filter(member => 
        member.user_addresses?.some(addr => addr.address_type === params.addressType)
      );
    }

    // Filter by address presence
    if (params.hasAddress !== undefined) {
      if (params.hasAddress) {
        filtered = filtered.filter(member => 
          member.user_addresses && member.user_addresses.length > 0
        );
      } else {
        filtered = filtered.filter(member => 
          !member.user_addresses || member.user_addresses.length === 0
        );
      }
    }

    // Filter by active status
    if (params.is_active !== undefined) {
      filtered = filtered.filter(member => member.is_active === params.is_active);
    }

    setFilteredMembers(filtered);
  }, [members]);

  // Calculate statistics
  const calculateStatistics = useCallback((data: MemberWithUserAddresses[]) => {
    const stats: MemberStatistics = {
      total: data.length,
      withAddresses: 0,
      withoutAddresses: 0,
      withPickupAddresses: 0,
      withMultipleAddresses: 0,
      activeMembers: 0,
      inactiveMembers: 0
    };

    data.forEach(member => {
      // Address statistics
      if (member.user_addresses && member.user_addresses.length > 0) {
        stats.withAddresses++;
        
        if (member.user_addresses.length > 1) {
          stats.withMultipleAddresses++;
        }
        
        if (member.user_addresses.some(addr => addr.address_type === 'pickup')) {
          stats.withPickupAddresses++;
        }
      } else {
        stats.withoutAddresses++;
      }

      // Active status statistics
      if (member.is_active) {
        stats.activeMembers++;
      } else {
        stats.inactiveMembers++;
      }
    });

    setStatistics(stats);
  }, []);

  // Add new address to member
  const addAddressToMember = useCallback(async (
    memberId: string, 
    address: Omit<UserAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<boolean> => {
    try {
      const newAddress = await addressServices.createUserAddress({
        ...address,
        user_id: memberId
      });

      if (newAddress) {
        // Refresh the member list
        await getMemberProfilesWithUserAddresses();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error adding address to member:', err);
      return false;
    }
  }, [getMemberProfilesWithUserAddresses]);

  // Update member address
  const updateMemberAddress = useCallback(async (
    addressId: string, 
    updates: Partial<UserAddress>
  ): Promise<boolean> => {
    try {
      const success = await addressServices.updateUserAddress(addressId, updates);
      
      if (success) {
        // Refresh the member list
        await getMemberProfilesWithUserAddresses();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating member address:', err);
      return false;
    }
  }, [getMemberProfilesWithUserAddresses]);

  // Set default address for member
  const setDefaultAddress = useCallback(async (
    memberId: string,
    addressId: string,
    addressType: string
  ): Promise<boolean> => {
    try {
      const success = await addressServices.setDefaultAddress(memberId, addressId, addressType);
      
      if (success) {
        // Refresh the member list
        await getMemberProfilesWithUserAddresses();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error setting default address:', err);
      return false;
    }
  }, [getMemberProfilesWithUserAddresses]);

  // Get default address for member
  const getDefaultAddress = useCallback(async (
    memberId: string,
    addressType?: string
  ): Promise<UserAddress | null> => {
    try {
      return await addressServices.getDefaultAddress(memberId, addressType);
    } catch (err) {
      console.error('Error getting default address:', err);
      return null;
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    getMemberProfilesWithUserAddresses();
  }, [getMemberProfilesWithUserAddresses]);

  return {
    members,
    filteredMembers,
    statistics,
    loading,
    error,
    searchMembers,
    addAddressToMember,
    updateMemberAddress,
    setDefaultAddress,
    getDefaultAddress,
    refreshMembers: getMemberProfilesWithUserAddresses
  };
}
