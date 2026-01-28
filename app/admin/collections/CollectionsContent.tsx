/**
 * Collections Page - Independent Data Fetching
 * 
 * This page fetches collections data DIRECTLY from the unified_collections table.
 * It is COMPLETELY INDEPENDENT of the Dashboard API and does not rely on any
 * dashboard data or services.
 * 
 * Data Source: unified_collections table (unified schema)
 * Fetch Method: UnifiedAdminService.getAllCollections() -> direct Supabase query
 * Real-time: Subscribes directly to unified_collections table changes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { UnifiedAdminService } from '@/lib/unified-admin-service';
import type { CollectionData } from '@/lib/unified-admin-service';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { useBackgroundRefresh } from '@/hooks/useBackgroundRefresh';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';
import { backgroundRefreshService } from '@/lib/backgroundRefreshService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle, XCircle, Clock, Search, Filter, Package, Users, Calendar, TrendingUp, Activity, Check, X, Copy, Settings, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { softDeleteCollection } from '@/lib/soft-delete-service';
import { clearPickupsCache } from '@/lib/admin-services';
import { ResetTransactionsDialog } from '@/components/ResetTransactionsDialog';
import { performExportToGenericPDF } from '@/lib/export-utils-generic';

export default function CollectionsContent() {
  // Collections page - uses same pattern as withdrawals page
  // Fetches directly from unified_collections table (independent of Dashboard API)
  const { profile } = useAuth();
  const [rows, setRows] = useState<CollectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [fullNameByEmail, setFullNameByEmail] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedCollectionForReset, setSelectedCollectionForReset] = useState<{ id: string; name: string } | null>(null);
  const isSuperAdmin = profile?.role === 'superadmin' || profile?.role === 'super_admin' || profile?.role === 'SUPER_ADMIN';
  
  // Fetch collections function - optimized for speed
  const loadCollections = useCallback(async () => {
    try {
      console.log('🔄 Collections: Starting loadCollections...');
      setError(null);
      setLoading(true);
      
      const directQueryPromise = UnifiedAdminService.getAllCollections();
      const timeoutPromise = new Promise<{ data: CollectionData[] | null, error: any }>((resolve) => 
        setTimeout(() => resolve({ data: null, error: new Error('Query timeout (120s)') }), 120000)
      );
      
      const { data, error: fetchError } = await Promise.race([directQueryPromise, timeoutPromise]);
      
      if (fetchError) {
        console.error('❌ Collections: Error loading from unified_collections:', fetchError);
        setError(fetchError);
        setRows([]);
      } else {
        console.log('📊 Collections: Loaded', data?.length || 0, 'collections from unified_collections');
        setRows(data || []);
      }
      console.log('✅ Collections: Finished loadCollections.');
      setLoading(false);
    } catch (err) {
      console.error('❌ Collections: Exception loading from unified_collections:', err);
      setError(err);
      setRows([]);
      setLoading(false);
    }
  }, []);

  // Background refresh - refreshes every 30 seconds (same pattern as withdrawals page)
  // Use stable callback ref to ensure proper cleanup
  const loadCollectionsRef = useRef(loadCollections);
  loadCollectionsRef.current = loadCollections;
  
  const stableLoadCollections = useCallback(() => {
    return loadCollectionsRef.current();
  }, []);
  
  const { forceRefresh, isRefreshing } = useBackgroundRefresh(
    'collections-page',
    stableLoadCollections
  );
  
  // Explicit cleanup to ensure background refresh stops when component unmounts
  useEffect(() => {
    return () => {
      // Stop background refresh when component unmounts
      backgroundRefreshService.stopBackgroundRefresh('collections-page');
    };
  }, []);

  // Realtime subscriptions - updates instantly when data changes
  const { isConnected } = useRealtimeConnection(
    [
      {
        table: 'unified_collections',
        onUpdate: (payload: any) => {
          console.log('📡 Collection updated:', payload);
          setRows(prev => prev.map(row => 
            row.id === payload.new?.id ? { ...row, ...payload.new } : row
          ));
        },
        onInsert: (payload: any) => {
          console.log('📡 New collection:', payload);
          setRows(prev => [payload.new, ...prev]);
        },
        onDelete: (payload: any) => {
          console.log('📡 Collection deleted:', payload);
          setRows(prev => prev.filter(c => c.id !== payload.old?.id));
        }
      }
    ],
    true
  );

  // Initial load (same pattern as withdrawals page)
  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Backfill resident and collector names by email if missing
  useEffect(() => {
    const fetchNames = async () => {
      try {
        const emails = Array.from(new Set(
          (rows || [])
            .flatMap((r: any) => [r.customer?.email, r.collector?.email])
            .map(e => (e || '').trim())
            .filter(Boolean)
        ));
        const missing = emails.filter(e => !fullNameByEmail[e]);
        if (missing.length === 0) return;

        const map: Record<string, string> = { ...fullNameByEmail };

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
  }, [rows, fullNameByEmail]);

  const getDisplayName = (fullName?: string, email?: string) => {
    const cleaned = (fullName || '').trim();
    if (cleaned) return cleaned;
    const e = (email || '').trim();
    if (!e) return 'Unknown Resident';
    const local = e.split('@')[0];
    const parts = local.replace(/\.+|_+|-+/g, ' ').split(' ').filter(Boolean);
    if (parts.length === 0) return e;
    const cased = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    return cased || e;
  };

  const resolvePersonName = (
    person?: CollectionData['customer'],
    fallbackLabel: string = 'Unknown'
  ) => {
    if (!person) return fallbackLabel;
    const email = (person.email || '').trim();
    if (email && fullNameByEmail[email]) {
      return fullNameByEmail[email];
    }
    const first = (person.first_name || '').toString().trim();
    const last = (person.last_name || '').toString().trim();
    if (first || last) {
      return [first, last].filter(Boolean).join(' ');
    }
    return getDisplayName(person.full_name, person.email) || fallbackLabel;
  };

  const handleUpdate = async (collectionId: string, newStatus: string) => {
    const confirmed = typeof window !== 'undefined' ? window.confirm(`Are you sure you want to mark this collection as ${newStatus}?`) : true;
    if (!confirmed) return;
    try {
      // Optimistic update
      setRows(prev => prev.map(c => c.id === collectionId ? { ...c, status: newStatus as 'pending' | 'submitted' | 'approved' | 'rejected' } : c));
      const { data, error } = await UnifiedAdminService.updateCollectionStatus(collectionId, newStatus);
      if (error || !data) {
        console.error('Error updating collection status:', error);
        // Revert on error - reload from server to get correct state
        loadCollections();
        setNotice({ type: 'error', message: error?.message || 'Failed to update status.' });
        return;
      }
      // Ensure row reflects server response
      setRows(prev => prev.map(c => c.id === collectionId ? { ...c, status: data.status, notes: data.notes } as any : c));
      setNotice({ type: 'success', message: `Status updated to ${data.status}.` });
    } catch (e) {
      console.error('Exception updating collection status:', e);
      // Reload from server to get correct state
      loadCollections();
      setNotice({ type: 'error', message: e instanceof Error ? e.message : 'Failed to update status.' });
    }
  };

  const openDetails = async (collectionId: string) => {
    try {
      setSelectedId(collectionId);
      setDetailsLoading(true);
      setDetails(null);

      // Fetch collection base data from unified_collections
      const base = await supabase
        .from('unified_collections')
        .select('*')
        .eq('id', collectionId)
        .maybeSingle();

      // Fetch materials with names
      const { data: items } = await supabase
        .from('collection_materials')
        .select('id, quantity, unit_price, material:materials(name)')
        .eq('collection_id', collectionId);

      // Fetch photos
      const { data: photos } = await supabase
        .from('collection_photos')
        .select('*')
        .eq('collection_id', collectionId)
        .order('uploaded_at', { ascending: false });

      // Normalize photo URLs and provide storage fallback if table has no entries
      const resolvedPhotos: any[] = [];
      const photoRows = Array.isArray(photos) ? photos : [];

      // 1) Normalize any stored paths to public URLs
      for (const ph of photoRows) {
        const raw = String(ph?.photo_url || '');
        if (raw.startsWith('http')) {
          resolvedPhotos.push(ph);
        } else if (raw) {
          try {
            const { data: pub } = supabase.storage
              .from('collection-photos')
              .getPublicUrl(raw);
            resolvedPhotos.push({ ...ph, photo_url: pub.publicUrl });
          } catch {
            resolvedPhotos.push(ph);
          }
        }
      }

      // 2) Fallback: if nothing in table, try listing storage by prefix `${collectionId}/`
      if (resolvedPhotos.length === 0) {
        try {
          const { data: files, error: listErr } = await supabase.storage
            .from('collection-photos')
            .list(`${collectionId}`, { limit: 100 });
          if (!listErr && Array.isArray(files)) {
            for (const f of files) {
              const path = `${collectionId}/${f.name}`;
              const { data: pub } = supabase.storage
                .from('collection-photos')
                .getPublicUrl(path);
              resolvedPhotos.push({ id: path, collection_id: collectionId, photo_url: pub.publicUrl, photo_type: 'general' });
            }
          }
        } catch {}
      }

      setDetails({ base: base.data, items: items || [], photos: resolvedPhotos });
    } catch (e) {
      setNotice({ type: 'error', message: 'Failed to load collection details.' });
    } finally {
      setDetailsLoading(false);
    }
  };

  // Export to PDF function
  const handleExportPDF = async () => {
    try {
      const totalCollections = rows.length;
      const pendingCollections = rows.filter(c => c.status === 'pending' || c.status === 'submitted').length;
      const approvedCollections = rows.filter(c => c.status === 'approved').length;
      const rejectedCollections = rows.filter(c => c.status === 'rejected').length;
      const totalWeight = rows.reduce((sum, c) => sum + (c.weight_kg || 0), 0);
      const totalValue = rows.reduce((sum, c) => sum + (c.computed_value || 0), 0);
      const avgValue = totalCollections > 0 ? totalValue / totalCollections : 0;
      const uniqueCustomers = new Set(rows.map(c => c.user_id).filter(Boolean)).size;
      const uniqueCollectors = new Set(rows.map(c => c.collector_id).filter(Boolean)).size;

      // Prepare data rows
      const exportRows = rows.map((row) => ({
        'Collection ID': row.id.substring(0, 8) + '...',
        'Resident': resolvePersonName(row.customer, 'Unknown'),
        'Collector': resolvePersonName(row.collector, 'Unassigned'),
        'Weight (kg)': (row.weight_kg || 0).toFixed(2),
        'Value (C)': (row.computed_value || 0).toFixed(2),
        'Status': row.status,
        'Created': new Date(row.created_at).toLocaleDateString(),
      }));

      // Top performers
      const customerTotals = rows.reduce((acc, row) => {
        const customerName = resolvePersonName(row.customer, 'Unknown');
        if (!acc[customerName]) {
          acc[customerName] = { collections: 0, totalValue: 0 };
        }
        acc[customerName].collections++;
        acc[customerName].totalValue += row.computed_value || 0;
        return acc;
      }, {} as Record<string, { collections: number; totalValue: number }>);

      const topCustomers = Object.entries(customerTotals)
        .map(([name, data]) => ({ name, collections: data.collections, value: data.totalValue }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);

      await performExportToGenericPDF({
        title: 'Collections Report',
        filename: `collections-report-${new Date().toISOString().split('T')[0]}.pdf`,
        columns: ['Collection ID', 'Resident', 'Collector', 'Weight (kg)', 'Value (C)', 'Status', 'Created'],
        rows: exportRows,
        logoPath: '/Woza logo white.png',
        reportType: 'collections',
        summary: {
          total: totalCollections,
          pending: pendingCollections,
          approved: approvedCollections,
          rejected: rejectedCollections,
          totalValue: totalValue,
          totalWeight: totalWeight,
          uniqueCustomers: uniqueCustomers,
          uniqueCollectors: uniqueCollectors,
          avgValue: avgValue,
        },
        topPerformers: {
          topCustomers: topCustomers.map(c => ({ name: c.name, count: c.collections, value: c.value })),
        },
      });

      setNotice({ type: 'success', message: 'PDF report exported successfully!' });
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      setNotice({ type: 'error', message: `Failed to export PDF: ${error.message}` });
    }
  };

  const handleDelete = async (collectionId: string) => {
    const confirmed = typeof window !== 'undefined' ? window.confirm('Move this collection to deleted transactions? This will hide it from Main App and Office views, but it can be restored later.') : true;
    if (!confirmed) return;
    
    console.log('🗑️ Starting soft delete for collection:', collectionId);
    
    try {
      // Optimistic remove
      const prevRows = rows;
      setRows(prev => prev.filter(c => c.id !== collectionId));
      
      console.log('🔄 Calling softDeleteCollection...');
      const result = await softDeleteCollection(collectionId, 'Deleted by super admin from Collections page');
      
      if (result.success) {
        console.log('✅ Collection soft deleted successfully');
        setNotice({ type: 'success', message: 'Collection moved to deleted transactions successfully.' });
        try { 
          clearPickupsCache(); 
          console.log('✅ Pickups cache cleared');
        } catch (cacheError) {
          console.warn('⚠️ Failed to clear pickups cache:', cacheError);
        }
        
        // Refresh the collections data without reloading the page
        setTimeout(() => {
          loadCollections();
          forceRefresh();
        }, 500);
      } else {
        console.error('❌ softDeleteCollection failed:', result.message);
        setRows(prevRows);
        setNotice({ type: 'error', message: `Failed to delete collection: ${result.message}` });
      }
    } catch (e) {
      console.error('❌ Exception in handleDelete:', e);
      setNotice({ type: 'error', message: `Failed to delete collection: ${e instanceof Error ? e.message : 'Unknown error'}` });
    }
  };

  const handleResetTransactions = (collection: any) => {
    setSelectedCollectionForReset({
      id: collection.id,
      name: `${resolvePersonName(collection.customer, 'Unknown Resident')} - ${collection.weight_kg || 0}kg`
    });
    setResetDialogOpen(true);
  };

  const handleResetSuccess = () => {
    setNotice({ type: 'success', message: 'Transactions reset successfully. Collection status updated.' });
    // Refresh the collections data without reloading the page
    loadCollections();
    forceRefresh();
  };

  const closeDetails = () => {
    setSelectedId(null);
    setDetails(null);
    setDetailsLoading(false);
  };

  if (loading && rows.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 w-full">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading collections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 w-full">
        <div className="text-center py-8 text-red-600">
          <p>Error loading collections: {error.message || 'Failed to load collections'}</p>
          <button 
            onClick={() => {
              loadCollections();
              forceRefresh();
            }} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Collections Management</h1>
            <p className="text-gray-600 text-sm">Manage and track material collections from residents</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Collections</div>
              <div className="text-xl font-bold text-blue-600">{rows.length}</div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={forceRefresh} 
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {notice && (
            <div className={`px-4 py-3 rounded-lg border ${notice.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{notice.message}</span>
                <button className="text-xs underline hover:no-underline" onClick={() => setNotice(null)}>Dismiss</button>
              </div>
            </div>
          )}
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-blue-900">Total Collections</CardTitle>
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {rows.length.toLocaleString()}
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
                  {rows.filter(c => c.status === 'pending' || c.status === 'submitted').length.toLocaleString()}
                </div>
                <p className="text-sm text-yellow-700 font-medium">
                  Awaiting approval
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-green-900">Approved</CardTitle>
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {rows.filter(c => c.status === 'approved').length.toLocaleString()}
                </div>
                <p className="text-sm text-green-700 font-medium">
                  Successfully processed
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 to-red-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-red-900">Rejected</CardTitle>
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <X className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {rows.filter(c => c.status === 'rejected').length.toLocaleString()}
                </div>
                <p className="text-sm text-red-700 font-medium">
                  Declined requests
                </p>
              </CardContent>
            </Card>
          </div>
        
          {/* Collections Table */}
          <Card className="border-0 shadow-xl bg-white">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    All Collections ({rows.length})
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Complete list of material collections from residents</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 hover:from-blue-700 hover:to-blue-800"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                    <Package className="w-4 h-4 mr-2" />
                    {rows.length} Collections
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collection ID</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resident</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collector</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (C/kg)</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value (C)</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map((collection) => (
                      <tr key={collection.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              title={collection.id}
                              className="text-sm font-medium text-gray-900"
                            >
                              {collection.id.substring(0, 8)}...
                            </span>
                            <button
                              type="button"
                              title="Copy full Collection ID"
                              aria-label="Copy full Collection ID"
                              className="text-gray-500 hover:text-gray-700"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(collection.id);
                                  setNotice({ type: 'success', message: 'Collection ID copied to clipboard.' });
                                } catch (e) {
                                  setNotice({ type: 'error', message: 'Failed to copy Collection ID.' });
                                }
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <Users className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">
                                {resolvePersonName(collection.customer, 'Unknown Resident')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                                <Package className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">
                                {resolvePersonName(collection.collector, 'Unassigned')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                              <Package className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {collection.material_type || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                              <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {collection.weight_kg || 0} kg
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            C{collection.material_rate_per_kg?.toFixed(2) || '0.00'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-green-600">
                            C{collection.computed_value?.toFixed(2) || '0.00'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                            collection.status === 'approved' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                            collection.status === 'rejected' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                            'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                          }`}>
                            {collection.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            {new Date(collection.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {(collection.status === 'pending' || collection.status === 'submitted') && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                  onClick={() => handleUpdate(collection.id, 'approved')}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-600 hover:bg-red-50"
                                  onClick={() => handleUpdate(collection.id, 'rejected')}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              onClick={() => openDetails(collection.id)}
                            >
                              <Activity className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            {collection.status === 'approved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                onClick={() => handleResetTransactions(collection)}
                                title="Reset transactions for this collection"
                              >
                                <Settings className="w-4 h-4 mr-1" />
                                Reset
                              </Button>
                            )}
                            {isSuperAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => handleDelete(collection.id)}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </div>
      
      {/* Details Modal */}
    {selectedId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={closeDetails} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 text-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Collection Details</h3>
            <button onClick={closeDetails} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {detailsLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-500">Loading…</div>
            ) : !details ? (
              <div className="text-center py-8 text-red-600">Failed to load details.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-800">Collection ID</div>
                    <div className="font-medium break-all">{details.base?.id}</div>
                  </div>
                  <div>
                    <div className="text-gray-800">Status</div>
                    <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      {details.base?.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-800">Customer</div>
                    <div className="font-medium">{details.base?.customer_name || details.base?.user_id || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-800">Collector</div>
                    <div className="font-medium">{details.base?.collector_name || details.base?.collector_id || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-800">Created</div>
                    <div className="font-medium">{details.base?.created_at ? new Date(details.base.created_at).toLocaleString() : '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-800">Total Weight (kg)</div>
                    <div className="font-medium">{details.base?.total_weight_kg ?? details.base?.weight_kg ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-800">Total Credits (C)</div>
                    <div className="font-medium">{Number(details.base?.total_value ?? details.base?.computed_value ?? 0).toFixed(2)}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-2">Materials</div>
                  {details.items?.length === 0 ? (
                    <div className="text-sm text-gray-500">No materials recorded.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-800">
                            <th className="py-2 pr-4">Material</th>
                            <th className="py-2 pr-4">Quantity (kg)</th>
                            <th className="py-2 pr-4">Unit Price</th>
                            <th className="py-2">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.items.map((it: any) => (
                            <tr key={it.id} className="border-t">
                              <td className="py-2 pr-4">{it.material?.name || '—'}</td>
                              <td className="py-2 pr-4">{Number(it.quantity || 0).toFixed(2)}</td>
                              <td className="py-2 pr-4">{Number(it.unit_price || 0).toFixed(2)}</td>
                              <td className="py-2">{(Number(it.quantity || 0) * Number(it.unit_price || 0)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold mb-2">Photos</div>
                  {details.photos?.length === 0 ? (
                    <div className="text-sm text-gray-500">No photos uploaded.</div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {details.photos.map((ph: any) => (
                        <a key={ph.id} href={ph.photo_url} target="_blank" rel="noreferrer" className="block">
                          <img src={ph.photo_url} alt={ph.photo_type || 'photo'} className="w-full h-24 object-cover rounded" />
                          <div className="text-xs text-gray-500 mt-1">{ph.photo_type || 'photo'}</div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button onClick={closeDetails} className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
          </div>
        </div>
      </div>
    )}

    {/* Reset Transactions Dialog */}
    {selectedCollectionForReset && (
      <ResetTransactionsDialog
        isOpen={resetDialogOpen}
        onClose={() => {
          setResetDialogOpen(false);
          setSelectedCollectionForReset(null);
        }}
        collectionId={selectedCollectionForReset.id}
        collectionName={selectedCollectionForReset.name}
        onSuccess={handleResetSuccess}
      />
    )}
      </div>
    </div>
  );
}
