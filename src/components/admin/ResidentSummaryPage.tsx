"use client";

import { useEffect, useMemo, useState } from 'react';
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
  Banknote
} from 'lucide-react';
import { getPickups, subscribeToPickups, updatePickupStatus, formatDate, formatCurrency, formatWeight, TransformedPickup } from '@/lib/admin-services';
import { supabase } from '../../lib/supabase';

function getDisplayName(fullName?: string, email?: string): string {
  const cleanedFullName = (fullName || '').trim();
  if (cleanedFullName) return cleanedFullName;
  const e = (email || '').trim();
  if (!e) return 'Unknown';
  const local = e.split('@')[0];
  const parts = local.replace(/\.+|_+|-+/g, ' ').split(' ').filter(Boolean);
  if (parts.length === 0) return e;
  const cased = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  return cased || e;
}

export default function ResidentSummaryPage() {
  const [pickups, setPickups] = useState<TransformedPickup[]>([]);
  const [filteredPickups, setFilteredPickups] = useState<TransformedPickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPickup, setSelectedPickup] = useState<TransformedPickup | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [fullNameByEmail, setFullNameByEmail] = useState<Record<string, string>>({});

  useEffect(() => {
    // Show UI immediately, load data in background
    setLoading(false);
    loadPickups();

    const subscription = subscribeToPickups((payload) => {
      if (payload.eventType === 'INSERT') {
        setPickups(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setPickups(prev => prev.map(pickup => pickup.id === payload.new.id ? payload.new : pickup));
      } else if (payload.eventType === 'DELETE') {
        setPickups(prev => prev.filter(pickup => pickup.id !== payload.old.id));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let filtered = pickups;
    if (searchTerm) {
      filtered = filtered.filter(pickup =>
        pickup.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pickup.customer?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pickup.collector?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pickup.address?.line1?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(pickup => pickup.status === statusFilter);
    }
    setFilteredPickups(filtered);
  }, [pickups, searchTerm, statusFilter]);

  // Backfill full names by email from users/profiles if missing
  useEffect(() => {
    const fetchNames = async () => {
      try {
        const emails = Array.from(new Set(
          filteredPickups
            .map(p => p.customer?.email?.trim())
            .filter(e => !!e && !((p: any) => p)(null)) as string[]
        ));
        const missing = emails.filter(e => !(fullNameByEmail[e]));
        if (missing.length === 0) return;

        // Query users table
        const { data: usersData } = await supabase
          .from('users')
          .select('email, full_name, first_name, last_name')
          .in('email', missing);
        const map: Record<string, string> = { ...fullNameByEmail };
        (usersData || []).forEach((u: any) => {
          const v = (u.full_name && String(u.full_name).trim())
            || `${(u.first_name||'').toString().trim()} ${(u.last_name||'').toString().trim()}`.trim();
          if (u.email && v) map[String(u.email)] = v;
        });

        // Fallback to legacy profiles if still missing
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

  const customerSummaries = useMemo(() => {
    const map = new Map<string, {
      customerId?: string;
      name: string;
      email: string;
      count: number;
      totalKg: number;
      totalValue: number;
      lastDate: string;
    }>();

    for (const p of filteredPickups) {
      const key = (p as any).user_id || p.customer?.email || 'unknown';
      const name = getDisplayName(p.customer?.full_name, p.customer?.email);
      const email = p.customer?.email || '';
      const existing = map.get(key) || { customerId: (p as any).user_id, name, email, count: 0, totalKg: 0, totalValue: 0, lastDate: '' };
      existing.count += 1;
      existing.totalKg += p.total_kg || 0;
      existing.totalValue += p.total_value || 0;
      const createdAt = (p as any).created_at as string;
      if (createdAt && (!existing.lastDate || new Date(createdAt).getTime() > new Date(existing.lastDate).getTime())) {
        existing.lastDate = createdAt;
      }
      map.set(key, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredPickups]);

  const loadPickups = async () => {
    try {
      setLoadError(null);
      // Load in background without blocking UI
      const data = await getPickups();
      setPickups(data);
    } catch (error) {
      setLoadError((error as any)?.message || 'Failed to load');
    }
  };

  const handleStatusUpdate = async (pickupId: string, newStatus: string) => {
    try {
      const result = await updatePickupStatus(pickupId, newStatus, approvalNote);
      if (result) {
        setPickups(prevPickups => prevPickups.map(pickup => pickup.id === pickupId ? { ...pickup, status: newStatus as 'submitted' | 'approved' | 'rejected', admin_notes: approvalNote } : pickup));
        setSelectedPickup(null);
        setApprovalNote('');
      }
    } catch (error) {
      // ignore
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
            <CardTitle>Resident Summary</CardTitle>
            <CardDescription>We couldn't load data right now.</CardDescription>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Resident Summary</h1>
            <p className="text-gray-600">Manage and track resident-related collections</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
              <Package className="w-4 h-4 mr-2" />
              {pickups.length} Total Records
            </Badge>
            <Badge className="text-sm bg-gradient-to-r from-yellow-600 to-yellow-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
              <Clock className="w-4 h-4 mr-2" />
              {pickups.filter(p => p.status === 'submitted').length} Pending
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-900">Total Records</CardTitle>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {pickups.length.toLocaleString()}
              </div>
              <p className="text-sm text-blue-700 font-medium">
                All time collections
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search residents or addresses..."
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

        {/* Resident Summary Table */}
        <Card className="border-0 shadow-xl bg-white">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <User className="w-5 h-5" />
                  Resident Summary ({customerSummaries.length})
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Aggregated totals per resident based on current filters</p>
              </div>
              <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                <User className="w-4 h-4 mr-2" />
                {customerSummaries.length} Residents
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resident</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collections</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Weight</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customerSummaries.map((row) => (
                    <tr key={(row.customerId || row.email || Math.random().toString())} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                              <User className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {fullNameByEmail[row.email] || row.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className="text-xs font-semibold px-3 py-1 rounded-full shadow-sm bg-gradient-to-r from-green-500 to-green-600 text-white">
                          {row.count} Collections
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Scale className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{formatWeight(row.totalKg || 0)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Banknote className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(row.totalValue || 0)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {row.lastDate ? formatDate(row.lastDate) : '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {customerSummaries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <User className="h-12 w-12 text-gray-400 mb-3" />
                          <p className="text-lg font-medium">No residents match your filters</p>
                          <p className="text-sm">Try adjusting your search or filter criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


