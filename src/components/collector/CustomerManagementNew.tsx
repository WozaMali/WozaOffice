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
  Loader2,
  AlertCircle,
  RefreshCw,
  Home,
  Building,
  Truck,
  CreditCard,
  Star
} from 'lucide-react';
import { profileServices } from '@/lib/supabase-services';
import type { MemberWithUserAddresses, UserAddress } from '@/lib/supabase';

export default function CustomerManagementNew() {
  const [customers, setCustomers] = useState<MemberWithUserAddresses[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<MemberWithUserAddresses[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [addressTypeFilter, setAddressTypeFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<MemberWithUserAddresses | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter customers based on search and filters
  useEffect(() => {
    let filtered = [...customers];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.full_name?.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.phone?.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(customer => 
        statusFilter === 'active' ? customer.is_active : !customer.is_active
      );
    }

    // Address type filter
    if (addressTypeFilter !== 'all') {
      filtered = filtered.filter(customer => 
        customer.user_addresses?.some(addr => addr.address_type === addressTypeFilter)
      );
    }

    setFilteredCustomers(filtered);
  }, [customers, searchTerm, statusFilter, addressTypeFilter]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the new collection member profiles service
      const data = await profileServices.getCollectionMemberProfiles();
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
      console.error('Error loading customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
    ) : (
      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading customers...</span>
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
          <h1 className="text-3xl font-bold">Customer Management</h1>
          <p className="text-gray-600">Manage customer profiles and addresses for collection</p>
        </div>
        <Button onClick={loadCustomers} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">
              {customers.filter(c => c.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Addresses</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => c.user_addresses && c.user_addresses.length > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pickup Addresses</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => 
                c.user_addresses?.some(addr => addr.address_type === 'pickup')
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Collection ready
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => 
                c.user_addresses && c.user_addresses.length === 0
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Need addresses
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
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
          <CardDescription>
            Click on a customer to view their details and addresses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{customer.full_name}</h3>
                      <Badge variant={customer.is_active ? "default" : "secondary"}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {customer.customer_status && (
                        <Badge variant="outline">{customer.customer_status}</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-4 h-4" />
                        <span>{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-4 h-4" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Address Summary */}
                    {customer.user_addresses && customer.user_addresses.length > 0 ? (
                      <div className="mt-3">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {customer.user_addresses.length} address(es)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {customer.user_addresses.map((address) => (
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

                    {/* Customer Stats */}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      {customer.wallet_balance !== undefined && (
                        <span>Balance: R{customer.wallet_balance.toFixed(2)}</span>
                      )}
                      {customer.total_points !== undefined && (
                        <span>Points: {customer.total_points}</span>
                      )}
                      {customer.total_pickups !== undefined && (
                        <span>Pickups: {customer.total_pickups}</span>
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

            {filteredCustomers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No customers found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedCustomer.full_name}</CardTitle>
                  <CardDescription>{selectedCustomer.email}</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCustomer(null)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm">{selectedCustomer.email}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm">{selectedCustomer.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge variant={selectedCustomer.is_active ? "default" : "secondary"}>
                      {selectedCustomer.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <Label>Customer Type</Label>
                    <p className="text-sm">{selectedCustomer.customer_status || 'Standard'}</p>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div>
                <h3 className="font-semibold mb-4">Addresses</h3>

                {selectedCustomer.user_addresses && selectedCustomer.user_addresses.length > 0 ? (
                  <div className="space-y-3">
                    {selectedCustomer.user_addresses.map((address) => (
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

              {/* Customer Stats */}
              <div>
                <h3 className="font-semibold mb-2">Customer Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Wallet Balance</Label>
                    <p className="text-sm">R{selectedCustomer.wallet_balance?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <Label>Total Points</Label>
                    <p className="text-sm">{selectedCustomer.total_points || 0}</p>
                  </div>
                  <div>
                    <Label>Total Pickups</Label>
                    <p className="text-sm">{selectedCustomer.total_pickups || 0}</p>
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
