'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  MapPin,
  Scale,
  TrendingUp,
  Calendar,
  User,
  Truck,
  Banknote,
  X
} from 'lucide-react';
import { getPickups, subscribeToPickups, updatePickupStatus, assignCollectorToCollection, deleteCollectionDeep, clearPickupsCache, formatDate, formatCurrency, formatWeight, TransformedPickup } from '@/lib/admin-services';
import { softDeleteCollection } from '@/lib/soft-delete-service';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

function getDisplayName(fullName?: string, email?: string): string {
  const cleaned = (fullName || '').trim();
  if (cleaned) return cleaned;
  const e = (email || '').trim();
  if (!e) return 'Unknown';
  const local = e.split('@')[0];
  const parts = local.replace(/\.+|_+|-+/g, ' ').split(' ').filter(Boolean);
  if (parts.length === 0) return e;
  const cased = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  return cased || e;
}

export default function PickupsPage() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'superadmin' || profile?.role === 'super_admin' || profile?.role === 'SUPER_ADMIN';
  const [pickups, setPickups] = useState<TransformedPickup[]>([]);
  const [filteredPickups, setFilteredPickups] = useState<TransformedPickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPickup, setSelectedPickup] = useState<TransformedPickup | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [fullNameByEmail, setFullNameByEmail] = useState<Record<string, string>>({});

  const resolveCustomerName = (customer?: TransformedPickup['customer']) => {
    if (!customer) return 'Unknown Resident';
    const email = (customer.email || '').trim();
    if (email && fullNameByEmail[email]) {
      return fullNameByEmail[email];
    }
    return getDisplayName(customer.full_name, customer.email);
  };

  const resolveCollectorName = (collector?: TransformedPickup['collector']) => {
    if (!collector) return 'Unassigned';
    return getDisplayName(collector.full_name, collector.email) || 'Unassigned';
  };

  // Load pickups and set up real-time subscription
  useEffect(() => {
    // Show UI immediately, load data in background
    setLoading(false);
    loadPickups();
    
    // Subscribe to real-time changes
    const subscription = subscribeToPickups((payload) => {
      console.log('📡 PickupsPage: Real-time update received:', payload.eventType);
      if (payload.eventType === 'INSERT') {
        console.log('📡 PickupsPage: Adding new pickup:', payload.new.id);
        setPickups(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        console.log('📡 PickupsPage: Updating pickup:', payload.new.id);
        setPickups(prev => prev.map(pickup => 
          pickup.id === payload.new.id ? payload.new : pickup
        ));
      } else if (payload.eventType === 'DELETE') {
        console.log('📡 PickupsPage: Deleting pickup:', payload.old.id);
        setPickups(prev => prev.filter(pickup => pickup.id !== payload.old.id));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter pickups based on search and filters
  useEffect(() => {
    let filtered = pickups;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(pickup =>
        pickup.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pickup.customer?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pickup.collector?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pickup.address?.line1?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(pickup => pickup.status === statusFilter);
    }

    setFilteredPickups(filtered);
  }, [pickups, searchTerm, statusFilter]);

  // Backfill resident names by email from users/profiles if missing
  useEffect(() => {
    const fetchNames = async () => {
      try {
        const emails = Array.from(new Set(
          filteredPickups.map(p => (p.customer?.email || '').trim()).filter(Boolean)
        ));
        const missing = emails.filter(e => !fullNameByEmail[e]);
        if (missing.length === 0) return;

        const map: Record<string, string> = { ...fullNameByEmail };

        // Primary: users table
        const { data: usersData } = await supabase
          .from('users')
          .select('email, full_name, first_name, last_name')
          .in('email', missing);
        (usersData || []).forEach((u: any) => {
          const first = (u.first_name || '').toString().trim();
          const last = (u.last_name || '').toString().trim();
          const nameFromParts = `${first} ${last}`.trim();
          const fallbackFull = (u.full_name && String(u.full_name).trim()) || '';
          const v = nameFromParts || fallbackFull;
          if (u.email && v) map[String(u.email)] = v;
        });

        // Fallback: legacy profiles
        const stillMissing = missing.filter(e => !map[e]);
        if (stillMissing.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('email, full_name')
            .in('email', stillMissing);
          (profilesData || []).forEach((p: any) => {
            if (p.email && p.full_name) map[String(p.email)] = String(p.full_name).trim();
          });
        }

        if (Object.keys(map).length !== Object.keys(fullNameByEmail).length) {
          setFullNameByEmail(map);
        }
      } catch (e) {
        // ignore lookup errors
      }
    };
    fetchNames();
  }, [filteredPickups, fullNameByEmail]);

  const loadPickups = async () => {
    try {
      console.log('🔄 PickupsPage: Loading pickups...');
      setLoadError(null);
      // Load in background without blocking UI
      const data = await getPickups();
      console.log('✅ PickupsPage: Pickups loaded:', data.length);
      setPickups(data);
    } catch (error) {
      console.error('❌ PickupsPage: Error loading pickups:', error);
      const errorMessage = (error as any)?.message || 'Failed to load pickups';
      setLoadError(errorMessage);
      setPickups([]);
    }
  };

  const handleStatusUpdate = async (pickupId: string, newStatus: string) => {
    try {
      console.log(`🔄 Updating collection ${pickupId} to status: ${newStatus}`);
      
      const result = await updatePickupStatus(pickupId, newStatus, approvalNote);
      
      if (result) {
        console.log('✅ Collection status updated successfully');
        
        // Show success message
        if (newStatus === 'approved') {
          alert('✅ Collection approved successfully! Customer wallet has been updated.');
        } else if (newStatus === 'rejected') {
          alert('❌ Collection rejected successfully.');
        }
        
        // Update local state immediately
        setPickups(prevPickups => 
          prevPickups.map(pickup => 
            pickup.id === pickupId 
              ? { ...pickup, status: newStatus as 'submitted' | 'approved' | 'rejected', admin_notes: approvalNote }
              : pickup
          )
        );
        
        setSelectedPickup(null);
        setApprovalNote('');
      }
    } catch (error) {
      console.error('❌ Error updating pickup status:', error);
      alert(`❌ Error updating collection status: ${(error as any)?.message || 'Unknown error'}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'pending':
      case 'submitted':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'completed':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'cancelled':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
      case 'submitted':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Pickups</CardTitle>
            <CardDescription>We couldn't load pickups right now.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-red-600 mb-3">{loadError}</div>
            <Button onClick={loadPickups} variant="outline">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 w-full">
      <div className="w-full">
      {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Pickup Management</h1>
            <p className="text-gray-600 text-sm">Manage and track all pickup requests from residents</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Pickups</div>
              <div className="text-xl font-bold text-blue-600">{pickups.length}</div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
      </div>

      {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900">Total Pickups</CardTitle>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {pickups.length.toLocaleString()}
              </div>
              <p className="text-sm text-blue-700 font-medium">
                All time pickups
            </p>
          </CardContent>
        </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-yellow-900">Pending</CardTitle>
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold text-yellow-600 mb-1">
                {pickups.filter(p => p.status === 'submitted').length.toLocaleString()}
            </div>
              <p className="text-sm text-yellow-700 font-medium">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-900">Total Weight</CardTitle>
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <Scale className="h-5 w-5 text-white" />
              </div>
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-1">
              {formatWeight(pickups.reduce((sum, p) => sum + (p.total_kg || 0), 0))}
            </div>
              <p className="text-sm text-green-700 font-medium">
                Recycled material
            </p>
          </CardContent>
        </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-900">Total Value</CardTitle>
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold text-purple-600 mb-1">
              {formatCurrency(pickups.reduce((sum, p) => sum + (p.total_value || 0), 0))}
            </div>
              <p className="text-sm text-purple-700 font-medium">
                Revenue generated
            </p>
          </CardContent>
        </Card>
      </div>

        {/* Filters Card */}
        <Card className="border-0 shadow-xl bg-white mb-6">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-gray-900">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
          <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search pickups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pickups Table */}
        <Card className="border-0 shadow-xl bg-white">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Pickups ({filteredPickups.length})
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Review and manage pickup requests from residents</p>
              </div>
              <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                <Package className="w-4 h-4 mr-2" />
                {filteredPickups.length} Pickups
              </Badge>
            </div>
        </CardHeader>
          <CardContent className="p-0">
          {filteredPickups.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pickups found</h3>
                <p className="text-gray-500 mb-4">
                {pickups.length === 0 
                  ? "No pickup data is available. This could mean:" 
                  : "No pickups match your current filters."}
              </p>
              {pickups.length === 0 && (
                  <div className="text-sm text-gray-400 space-y-1">
                  <p>• No collections have been submitted yet</p>
                  <p>• Database tables may not exist or be accessible</p>
                  <p>• Check browser console for detailed error messages</p>
                </div>
              )}
              <Button 
                onClick={loadPickups} 
                variant="outline" 
                  className="mt-4 border-gray-300 hover:bg-gray-50"
              >
                Refresh Data
              </Button>
            </div>
          ) : (
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resident</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collector</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {filteredPickups.map((pickup) => (
                    <tr key={pickup.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                              <User className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {resolveCustomerName(pickup.customer)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                              <Truck className="h-5 w-5 text-white" />
                      </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {resolveCollectorName(pickup.collector)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                            <MapPin className="h-4 w-4 text-white" />
                      </div>
                          <div className="text-sm text-gray-900">
                          {pickup.address?.line1}, {pickup.address?.suburb}
                        </div>
                      </div>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                            <Scale className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                          {formatWeight(pickup.total_kg || 0)}
                        </span>
                      </div>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                            <Banknote className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-bold text-green-600">
                          {formatCurrency(pickup.total_value || 0)}
                        </span>
                      </div>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                          pickup.status === 'approved' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                          pickup.status === 'rejected' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                          pickup.status === 'submitted' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' :
                          'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                        }`}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(pickup.status)}
                          {pickup.status}
                        </div>
                      </Badge>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        {formatDate((pickup as any).created_at)}
                      </div>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPickup(pickup)}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                        </Button>
                        {isSuperAdmin && (
                          <Button
                              variant="outline"
                            size="sm"
                            onClick={async () => {
                              const confirmed = typeof window !== 'undefined' ? window.confirm('Move this collection to deleted transactions? This will hide it from Main App and Office views, but it can be restored later.') : true;
                              if (!confirmed) return;
                              // Optimistic remove
                              const prev = pickups;
                              setPickups(p => p.filter(x => x.id !== pickup.id));
                              const result = await softDeleteCollection(pickup.id, 'Deleted by super admin from Pickups page');
                              if (!result.success) {
                                setPickups(prev);
                                alert(`Failed to delete collection: ${result.message}`);
                              } else {
                                try { clearPickupsCache(); } catch {}
                                try { await loadPickups(); } catch {}
                              }
                            }}
                              className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                              <X className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        )}
                        {((pickup.status as string) === 'pending' || pickup.status === 'submitted') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => handleStatusUpdate(pickup.id, 'approved')}
                            >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => handleStatusUpdate(pickup.id, 'rejected')}
                            >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
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
      </div>

      {/* Approval Modal */}
      {selectedPickup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Pickup Details</h3>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Resident:</span> 
                <span className="text-gray-900">{resolveCustomerName(selectedPickup.customer)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Collector:</span> 
                <span className="text-gray-900">{resolveCollectorName(selectedPickup.collector)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Location:</span> 
                <span className="text-gray-900">
                  {selectedPickup.address?.line1}, {selectedPickup.address?.suburb}, {selectedPickup.address?.city}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Weight:</span> 
                <span className="text-gray-900 font-semibold">{formatWeight(selectedPickup.total_kg || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Value:</span> 
                <span className="text-gray-900 font-semibold">{formatCurrency(selectedPickup.total_value || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Status:</span> 
                <Badge className={`ml-2 ${getStatusBadge(selectedPickup.status)}`}>
                  {selectedPickup.status}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Date:</span> 
                <span className="text-gray-900">{formatDate((selectedPickup as any).created_at)}</span>
              </div>
            </div>

            {/* Pickup Items Breakdown */}
            {(selectedPickup as any).pickup_items && (selectedPickup as any).pickup_items.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-3">Materials Collected:</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  {(selectedPickup as any).pickup_items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">
                          {item.material?.name || 'Unknown Material'}
                        </span>
                        {item.contamination_pct && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({item.contamination_pct}% contamination)
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900">
                          {formatWeight(item.kilograms || 0)}
                        </span>
                        <div className="text-sm text-gray-500">
                          {formatCurrency((item.kilograms || 0) * (item.material?.rate_per_kg || 0))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedPickup.status === 'submitted' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Approval Note (Optional)</label>
                <Textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="Add a note about this pickup..."
                  rows={3}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
                              <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPickup(null);
                    setApprovalNote('');
                  }}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Close
                </Button>
              {((selectedPickup.status as string) === 'pending' || selectedPickup.status === 'submitted') && (
                <>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStatusUpdate(selectedPickup.id, 'approved')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleStatusUpdate(selectedPickup.id, 'rejected')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
