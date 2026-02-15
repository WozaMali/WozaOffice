/**
 * Watch AD Earnings Approval Page
 * 
 * This page allows admins to view and approve/reject watch ad earnings.
 * Similar to the Collections page, it shows pending watch ad earnings that need approval.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getSupabaseClient } from '@/lib/supabase';
import { useBackgroundRefresh } from '@/hooks/useBackgroundRefresh';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';
import { backgroundRefreshService } from '@/lib/backgroundRefreshService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle, XCircle, Clock, Search, Filter, Video, Users, Calendar, TrendingUp, Activity, Check, X, Copy, Eye, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface WatchAdEarning {
  id: string;
  user_id: string;
  video_id: string;
  watch_started_at: string;
  watch_completed_at: string | null;
  watch_duration_seconds: number | null;
  watch_percentage: number | null;
  is_qualified: boolean;
  credits_awarded: number | null;
  approval_status: 'pending' | 'approved' | 'rejected' | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    full_name: string | null;
  };
  video?: {
    id: string;
    title: string;
    credit_amount: number;
    thumbnail_url: string | null;
  };
}

export default function WatchAdsEarningsContent() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<WatchAdEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Fetch watch ad earnings
  const loadEarnings = useCallback(async () => {
    try {
      console.log('🔄 Watch AD Earnings: Starting loadEarnings...');
      setError(null);
      setLoading(true);
      
      // Fetch from API route using admin client
      const response = await fetch(`/api/admin/watch-ads-earnings?status=${statusFilter}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const earnings = result.earnings || [];

      console.log('📊 Watch AD Earnings: Loaded', earnings.length, 'earnings');
      setRows(earnings);
      console.log('✅ Watch AD Earnings: Finished loadEarnings.');
      setLoading(false);
    } catch (err) {
      console.error('❌ Watch AD Earnings: Exception loading:', err);
      setError(err);
      setRows([]);
      setLoading(false);
    }
  }, [statusFilter]);

  // Background refresh
  const loadEarningsRef = useRef(loadEarnings);
  loadEarningsRef.current = loadEarnings;
  
  const stableLoadEarnings = useCallback(() => {
    return loadEarningsRef.current();
  }, []);
  
  const { forceRefresh, isRefreshing } = useBackgroundRefresh(
    'watch-ads-earnings-page',
    stableLoadEarnings
  );
  
  useEffect(() => {
    return () => {
      backgroundRefreshService.stopBackgroundRefresh('watch-ads-earnings-page');
    };
  }, []);

  // Realtime subscriptions
  const { isConnected } = useRealtimeConnection();

  // Initial load
  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  // Delete watch ad earning
  const handleDelete = async (watchId: string) => {
    const confirmed = typeof window !== 'undefined' 
      ? window.confirm('Are you sure you want to delete this watch ad earning? This action cannot be undone.') 
      : true;
    if (!confirmed) return;
    
    try {
      // Optimistic update - remove from list
      setRows(prev => prev.filter(w => w.id !== watchId));
      
      const response = await fetch(`/api/admin/watch-ads-earnings/${watchId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `Failed to delete (${response.status})`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Reload to get updated data
      loadEarnings();
      setNotice({ 
        type: 'success', 
        message: 'Watch ad earning deleted successfully.' 
      });
    } catch (e) {
      console.error('Exception deleting watch ad earning:', e);
      loadEarnings();
      setNotice({ 
        type: 'error', 
        message: e instanceof Error ? e.message : 'Failed to delete watch ad earning.' 
      });
    }
  };

  // Update approval status
  const handleUpdate = async (watchId: string, newStatus: 'approved' | 'rejected') => {
    const confirmed = typeof window !== 'undefined' 
      ? window.confirm(`Are you sure you want to ${newStatus === 'approved' ? 'approve' : 'reject'} this watch ad earning?`) 
      : true;
    if (!confirmed) return;
    
    try {
      // Optimistic update
      setRows(prev => prev.map(w => 
        w.id === watchId 
          ? { ...w, approval_status: newStatus } 
          : w
      ));
      
      const response = await fetch(`/api/admin/watch-ads-earnings/${watchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `Failed to update status (${response.status})`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Reload to get updated data
      loadEarnings();
      setNotice({ 
        type: 'success', 
        message: `Watch ad earning ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully.` 
      });
    } catch (e) {
      console.error('Exception updating watch ad earning status:', e);
      loadEarnings();
      setNotice({ 
        type: 'error', 
        message: e instanceof Error ? e.message : 'Failed to update status.' 
      });
    }
  };

  // Open details modal
  const openDetails = async (watchId: string) => {
    try {
      setSelectedId(watchId);
      setDetailsLoading(true);
      setDetails(null);

      const supabase = getSupabaseClient();
      
      // Fetch watch data first
      const { data: watchData, error: watchError } = await supabase
        .from('video_watches')
        .select('*')
        .eq('id', watchId)
        .single();

      if (watchError) throw watchError;
      if (!watchData) {
        throw new Error('Watch record not found');
      }

      // Fetch user data separately
      let userData = null;
      if (watchData.user_id) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, full_name, phone')
          .eq('id', watchData.user_id)
          .single();
        
        if (!userError && user) {
          userData = user;
        }
      }

      // Fetch video data separately
      let videoData = null;
      if (watchData.video_id) {
        const { data: video, error: videoError } = await supabase
          .from('watch_ads_videos')
          .select('id, title, description, credit_amount, thumbnail_url, watch_duration_seconds, watch_percentage_required')
          .eq('id', watchData.video_id)
          .single();
        
        if (!videoError && video) {
          videoData = video;
        }
      }

      // Combine the data
      setDetails({
        ...watchData,
        user: userData,
        video: videoData
      });
    } catch (e) {
      console.error('Error loading watch details:', e);
      setNotice({ type: 'error', message: 'Failed to load watch details.' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedId(null);
    setDetails(null);
    setDetailsLoading(false);
  };

  // Resolve user name
  const resolveUserName = (user: any, fallback: string = 'Unknown User') => {
    if (!user) return fallback;
    const first = (user.first_name || '').toString().trim();
    const last = (user.last_name || '').toString().trim();
    if (first || last) {
      return [first, last].filter(Boolean).join(' ');
    }
    return user.full_name || user.email || fallback;
  };

  // Filter rows based on search
  const filteredRows = rows.filter((row) => {
    const matchesSearch = !searchTerm || 
      resolveUserName(row.user).toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.video?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading && rows.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 w-full">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading watch ad earnings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 w-full">
        <div className="text-center py-8 text-red-600">
          <p>Error loading watch ad earnings: {error.message || 'Failed to load earnings'}</p>
          <button 
            onClick={() => {
              loadEarnings();
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

  const pendingCount = rows.filter(w => !w.approval_status || w.approval_status === 'pending').length;
  const approvedCount = rows.filter(w => w.approval_status === 'approved').length;
  const rejectedCount = rows.filter(w => w.approval_status === 'rejected').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Watch AD Earnings</h1>
            <p className="text-gray-600 text-sm">Approve and manage watch ad earnings from residents</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Earnings</div>
              <div className="text-xl font-bold text-blue-600">{rows.length}</div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Video className="h-6 w-6 text-white" />
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
            <div className={`px-4 py-3 rounded-lg border ${
              notice.type === 'success' 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{notice.message}</span>
                <button className="text-xs underline hover:no-underline" onClick={() => setNotice(null)}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-blue-900">Total Earnings</CardTitle>
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <Video className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {rows.length.toLocaleString()}
                </div>
                <p className="text-sm text-blue-700 font-medium">
                  All watch ad earnings
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
                  {pendingCount.toLocaleString()}
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
                  {approvedCount.toLocaleString()}
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
                  {rejectedCount.toLocaleString()}
                </div>
                <p className="text-sm text-red-700 font-medium">
                  Declined requests
                </p>
              </CardContent>
            </Card>
          </div>
        
          {/* Filters */}
          <Card className="border-0 shadow-xl bg-white">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by user name, email, or video title..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('all')}
                    size="sm"
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === 'pending' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('pending')}
                    size="sm"
                  >
                    Pending
                  </Button>
                  <Button
                    variant={statusFilter === 'approved' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('approved')}
                    size="sm"
                  >
                    Approved
                  </Button>
                  <Button
                    variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('rejected')}
                    size="sm"
                  >
                    Rejected
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Earnings Table */}
          <Card className="border-0 shadow-xl bg-white">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Video className="h-5 w-5 text-blue-600" />
                    Watch AD Earnings ({filteredRows.length})
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Complete list of watch ad earnings from residents</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Watch ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Video
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credits
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Watch Duration
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completed
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          No watch ad earnings found.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((earning) => (
                        <tr key={earning.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                title={earning.id}
                                className="text-sm font-medium text-gray-900"
                              >
                                {earning.id.substring(0, 8)}...
                              </span>
                              <button
                                type="button"
                                title="Copy full Watch ID"
                                className="text-gray-500 hover:text-gray-700"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(earning.id);
                                    setNotice({ type: 'success', message: 'Watch ID copied to clipboard.' });
                                  } catch (e) {
                                    setNotice({ type: 'error', message: 'Failed to copy Watch ID.' });
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
                                  {resolveUserName(earning.user)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {earning.user?.email || '—'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {earning.video?.thumbnail_url && (
                                <img 
                                  src={earning.video.thumbnail_url} 
                                  alt={earning.video.title}
                                  className="w-12 h-8 object-cover rounded mr-3"
                                />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {earning.video?.title || 'Unknown Video'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Credit: C{earning.video?.credit_amount?.toFixed(2) || '0.00'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-green-600">
                              C{earning.credits_awarded?.toFixed(2) || earning.video?.credit_amount?.toFixed(2) || '0.00'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {earning.watch_duration_seconds 
                                ? `${Math.floor(earning.watch_duration_seconds / 60)}:${String(earning.watch_duration_seconds % 60).padStart(2, '0')}`
                                : '—'
                              }
                            </div>
                            <div className="text-xs text-gray-500">
                              {earning.watch_percentage ? `${earning.watch_percentage.toFixed(0)}%` : '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                              earning.approval_status === 'approved' 
                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                              earning.approval_status === 'rejected' 
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                              'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                            }`}>
                              {earning.approval_status || 'pending'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                              {earning.watch_completed_at 
                                ? new Date(earning.watch_completed_at).toLocaleDateString()
                                : '—'
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {(!earning.approval_status || earning.approval_status === 'pending') && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                    onClick={() => handleUpdate(earning.id, 'approved')}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    onClick={() => handleUpdate(earning.id, 'rejected')}
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
                                onClick={() => openDetails(earning.id)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => handleDelete(earning.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Details Modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeDetails} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 text-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Watch AD Earning Details</h3>
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
                      <div className="text-gray-800">Watch ID</div>
                      <div className="font-medium break-all">{details.id}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Status</div>
                      <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {details.approval_status || 'pending'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-800">User</div>
                      <div className="font-medium">
                        {resolveUserName(details.user)} ({details.user?.email || '—'})
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-800">Video</div>
                      <div className="font-medium">{details.video?.title || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-800">Credits Awarded</div>
                      <div className="font-medium text-green-600">
                        C{details.credits_awarded?.toFixed(2) || details.video?.credit_amount?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-800">Watch Duration</div>
                      <div className="font-medium">
                        {details.watch_duration_seconds 
                          ? `${Math.floor(details.watch_duration_seconds / 60)}:${String(details.watch_duration_seconds % 60).padStart(2, '0')}`
                          : '—'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-800">Watch Percentage</div>
                      <div className="font-medium">
                        {details.watch_percentage ? `${details.watch_percentage.toFixed(1)}%` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-800">Qualified</div>
                      <div className="font-medium">
                        {details.is_qualified ? 'Yes' : 'No'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-800">Started At</div>
                      <div className="font-medium">
                        {details.watch_started_at 
                          ? new Date(details.watch_started_at).toLocaleString()
                          : '—'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-800">Completed At</div>
                      <div className="font-medium">
                        {details.watch_completed_at 
                          ? new Date(details.watch_completed_at).toLocaleString()
                          : '—'
                        }
                      </div>
                    </div>
                  </div>

                  {details.video?.description && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Video Description</div>
                      <div className="text-sm text-gray-700">{details.video.description}</div>
                    </div>
                  )}

                  {details.video?.thumbnail_url && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Video Thumbnail</div>
                      <img 
                        src={details.video.thumbnail_url} 
                        alt={details.video.title}
                        className="w-full max-w-md rounded"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button 
                onClick={closeDetails} 
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
