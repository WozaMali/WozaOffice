'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Search, 
  Filter, 
  MapPin, 
  User, 
  Scale, 
  Camera, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Phone,
  Plus,
  List
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import PickupForm from './PickupForm';

interface Pickup {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  status: 'pending' | 'approved' | 'cancelled' | 'completed';
  totalKg: number;
  totalValue: number;
  materials: Array<{
    name: string;
    kilograms: number;
    photos: string[];
  }>;
  createdAt: string;
  notes?: string;
}

import { getCollectorPickups, getAllPickups, updatePickupStatus, Pickup as PickupType } from '@/lib/pickupService';

export default function PickupManagement() {
  const [activeTab, setActiveTab] = useState('list');
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [filteredPickups, setFilteredPickups] = useState<Pickup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load pickups on component mount
  useEffect(() => {
    loadPickups();
  }, []);

  // Filter pickups when search or status changes
  useEffect(() => {
    let filtered = pickups;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(pickup =>
        pickup.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pickup.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pickup.customerPhone.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(pickup => pickup.status === statusFilter);
    }

    setFilteredPickups(filtered);
  }, [pickups, searchTerm, statusFilter]);

  const loadPickups = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For now, we'll use getAllPickups since we don't have collector context
      // In a real app, you'd get the collector ID from auth context
      const { data, error } = await getAllPickups({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined
      });

      if (error) {
        console.error('Error loading pickups:', error);
        setError('Failed to load pickups');
        setPickups([]);
      } else {
        setPickups(data || []);
      }
    } catch (err) {
      console.error('Exception loading pickups:', err);
      setError('Failed to load pickups');
      setPickups([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'approved':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-orange-600" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const updatePickupStatus = (pickupId: string, newStatus: Pickup['status']) => {
    setPickups(prev => prev.map(pickup =>
      pickup.id === pickupId ? { ...pickup, status: newStatus } : pickup
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pickup Management</h1>
          <p className="text-gray-600 mt-2">Track and manage your recycling collections</p>
        </div>

      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            View Pickups
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Pickup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pickups</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pickups.length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pickups.reduce((sum, p) => sum + p.totalKg, 0).toFixed(1)} kg
            </div>
            <p className="text-xs text-muted-foreground">
              Collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R {pickups.reduce((sum, p) => sum + p.totalValue, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pickups.filter(p => p.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by customer name, address, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pickups Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pickups ({filteredPickups.length})</CardTitle>
          <CardDescription>
            Manage and track all your pickup collections
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                <span className="text-gray-600">Loading pickups...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-red-600 mb-2">⚠️ {error}</div>
                <button 
                  onClick={loadPickups}
                  className="text-orange-600 hover:text-orange-700 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Materials</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Weight</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Value</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                {filteredPickups.map((pickup) => (
                  <tr key={pickup.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{pickup.customerName}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {pickup.customerPhone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="max-w-[200px] truncate">{pickup.address}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {pickup.materials.map((material, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Package className="w-3 h-3 text-orange-600" />
                            <span>{material.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {material.kilograms} kg
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{pickup.totalKg} kg</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-orange-600">
                        R {pickup.totalValue.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusBadge(pickup.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(pickup.status)}
                          {pickup.status.charAt(0).toUpperCase() + pickup.status.slice(1)}
                        </div>
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {formatDate(pickup.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPickup(pickup)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {pickup.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updatePickupStatus(pickup.id, 'approved')}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updatePickupStatus(pickup.id, 'cancelled')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="new" className="space-y-6">
          <PickupForm />
        </TabsContent>
      </Tabs>

      {/* Pickup Detail Modal */}
      {selectedPickup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pickup Details</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPickup(null)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Customer</Label>
                  <p className="font-medium">{selectedPickup.customerName}</p>
                  <p className="text-sm text-gray-500">{selectedPickup.customerPhone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <Badge className={getStatusBadge(selectedPickup.status)}>
                    {selectedPickup.status.charAt(0).toUpperCase() + selectedPickup.status.slice(1)}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Address</Label>
                <p className="text-sm">{selectedPickup.address}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Materials</Label>
                <div className="space-y-2">
                  {selectedPickup.materials.map((material, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium">{material.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{material.kilograms} kg</Badge>
                        <Badge variant="secondary">{material.photos.length} photos</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Total Weight</Label>
                  <p className="text-lg font-bold">{selectedPickup.totalKg} kg</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Total Value</Label>
                  <p className="text-lg font-bold text-orange-600">R {selectedPickup.totalValue.toFixed(2)}</p>
                </div>
              </div>

              {selectedPickup.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Notes</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded">{selectedPickup.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedPickup(null)}
                >
                  Close
                </Button>
                <Button>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Pickup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
