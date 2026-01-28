'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  Eye, 
  Edit,
  Plus,
  Home,
  Building,
  Truck,
  CreditCard,
  Loader2,
  AlertCircle,
  RefreshCw,
  Star
} from 'lucide-react';
import { useMemberProfiles } from '@/hooks/use-member-profiles';
import type { MemberWithUserAddresses, UserAddress } from '@/lib/supabase';

export default function MemberManagement() {
  const {
    members,
    filteredMembers,
    statistics,
    loading,
    error,
    searchMembers,
    addAddressToMember,
    updateMemberAddress,
    setDefaultAddress,
    refreshMembers
  } = useMemberProfiles();

  const [searchTerm, setSearchTerm] = useState('');
  const [addressTypeFilter, setAddressTypeFilter] = useState<string>('all');
  const [hasAddressFilter, setHasAddressFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<MemberWithUserAddresses | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  // Search and filter
  useEffect(() => {
    const params = {
      searchTerm: searchTerm || undefined,
      addressType: addressTypeFilter !== 'all' ? addressTypeFilter as any : undefined,
      hasAddress: hasAddressFilter !== 'all' ? hasAddressFilter === 'yes' : undefined
    };
    searchMembers(params);
  }, [searchTerm, addressTypeFilter, hasAddressFilter, searchMembers]);

  const getAddressTypeIcon = (type: string) => {
    switch (type) {
      case 'primary': return <Home className="w-4 h-4" />;
      case 'secondary': return <Building className="w-4 h-4" />;
      case 'pickup': return <Truck className="w-4 h-4" />;
      case 'billing': return <CreditCard className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getAddressTypeColor = (type: string) => {
    switch (type) {
      case 'primary': return 'bg-blue-100 text-blue-800';
      case 'secondary': return 'bg-gray-100 text-gray-800';
      case 'pickup': return 'bg-green-100 text-green-800';
      case 'billing': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAddress = (address: UserAddress) => {
    const parts = [
      address.address_line1,
      address.address_line2,
      address.city,
      address.province,
      address.postal_code
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  const handleSetDefaultAddress = async (memberId: string, addressId: string, addressType: string) => {
    const success = await setDefaultAddress(memberId, addressId, addressType);
    if (success) {
      // Optionally show a success message
      console.log('Default address updated successfully');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading members...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <span className="ml-2 text-red-500">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Member Management</h1>
          <p className="text-gray-600">Manage member profiles and addresses</p>
        </div>
        <Button onClick={refreshMembers} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.activeMembers} active, {statistics.inactiveMembers} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Addresses</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.withAddresses}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.withoutAddresses} without addresses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pickup Addresses</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.withPickupAddresses}</div>
            <p className="text-xs text-muted-foreground">
              Ready for collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Multiple Addresses</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.withMultipleAddresses}</div>
            <p className="text-xs text-muted-foreground">
              Have multiple addresses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="addressType">Address Type</Label>
              <select
                id="addressType"
                value={addressTypeFilter}
                onChange={(e) => setAddressTypeFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Types</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="pickup">Pickup</option>
                <option value="billing">Billing</option>
              </select>
            </div>

            <div>
              <Label htmlFor="hasAddress">Has Address</Label>
              <select
                id="hasAddress"
                value={hasAddressFilter}
                onChange={(e) => setHasAddressFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Members</option>
                <option value="yes">With Addresses</option>
                <option value="no">Without Addresses</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({filteredMembers.length})</CardTitle>
          <CardDescription>
            Click on a member to view their details and addresses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedMember(member)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{member.full_name}</h3>
                      <Badge variant={member.is_active ? "default" : "secondary"}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {member.tier && (
                        <Badge variant="outline">{member.tier}</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-4 h-4" />
                        <span>{member.email}</span>
                      </div>
                      {member.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-4 h-4" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Address Summary */}
                    {member.user_addresses && member.user_addresses.length > 0 ? (
                      <div className="mt-3">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {member.user_addresses.length} address(es)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {member.user_addresses.map((address) => (
                            <Badge
                              key={address.id}
                              variant="outline"
                              className={`text-xs ${getAddressTypeColor(address.address_type)}`}
                            >
                              <div className="flex items-center space-x-1">
                                {getAddressTypeIcon(address.address_type)}
                                <span>{address.address_type}</span>
                                {address.is_default && <Star className="w-3 h-3" />}
                              </div>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-gray-500">
                        No addresses on file
                      </div>
                    )}

                    {/* Member Stats */}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      {member.wallet_balance !== undefined && (
                        <span>Balance: C{member.wallet_balance.toFixed(2)}</span>
                      )}
                      {member.total_points !== undefined && (
                        <span>Points: {member.total_points}</span>
                      )}
                      {member.total_pickups !== undefined && (
                        <span>Pickups: {member.total_pickups}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredMembers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No members found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedMember.full_name}</CardTitle>
                  <CardDescription>{selectedMember.email}</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMember(null)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Member Info */}
              <div>
                <h3 className="font-semibold mb-2">Member Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm">{selectedMember.email}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm">{selectedMember.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge variant={selectedMember.is_active ? "default" : "secondary"}>
                      {selectedMember.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <Label>Tier</Label>
                    <p className="text-sm">{selectedMember.tier || 'Not assigned'}</p>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Addresses</h3>
                  <Button size="sm" onClick={() => setIsAddingAddress(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Address
                  </Button>
                </div>

                {selectedMember.user_addresses && selectedMember.user_addresses.length > 0 ? (
                  <div className="space-y-3">
                    {selectedMember.user_addresses.map((address) => (
                      <div key={address.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getAddressTypeIcon(address.address_type)}
                            <span className="font-medium capitalize">{address.address_type}</span>
                            {address.is_default && (
                              <Badge variant="outline" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {!address.is_default && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetDefaultAddress(
                                  selectedMember.id,
                                  address.id,
                                  address.address_type
                                )}
                              >
                                Set Default
                              </Button>
                            )}
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          {formatAddress(address)}
                        </p>
                        {address.notes && (
                          <p className="text-xs text-gray-500 mt-1">
                            Note: {address.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No addresses on file
                  </div>
                )}
              </div>

              {/* Member Stats */}
              <div>
                <h3 className="font-semibold mb-2">Member Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Wallet Balance</Label>
                    <p className="text-sm">C{selectedMember.wallet_balance?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <Label>Total Points</Label>
                    <p className="text-sm">{selectedMember.total_points || 0}</p>
                  </div>
                  <div>
                    <Label>Total Pickups</Label>
                    <p className="text-sm">{selectedMember.total_pickups || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
