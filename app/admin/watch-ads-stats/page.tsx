'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, Video, TrendingUp, DollarSign, Calendar, Download, Filter } from 'lucide-react';

interface WatchStats {
  summary: {
    total_watches: number;
    qualified_watches: number;
    total_credits_awarded: number;
    qualification_rate: string;
  };
  by_video: Array<{
    video_id: string;
    video_title: string;
    total_watches: number;
    qualified_watches: number;
    total_credits: number;
    users: Array<{
      user_id: string;
      email: string;
      name: string;
      employee_number?: string;
      watched_at: string;
      is_qualified: boolean;
      credits_awarded: number;
    }>;
  }>;
  by_user: Array<{
    user_id: string;
    user_email: string;
    user_name: string;
    employee_number?: string;
    total_watches: number;
    qualified_watches: number;
    total_credits: number;
    videos: Array<{
      video_id: string;
      video_title: string;
      watched_at: string;
      is_qualified: boolean;
      credits_awarded: number;
    }>;
  }>;
  watches: Array<any>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export default function WatchAdsStatsPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WatchStats | null>(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    video_id: '',
    user_id: '',
    start_date: '',
    end_date: ''
  });
  const [viewMode, setViewMode] = useState<'summary' | 'by_video' | 'by_user' | 'detailed'>('summary');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/admin-login');
      return;
    }

    if (user) {
      loadStats();
    }
  }, [user, authLoading, router]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (filters.video_id) params.append('video_id', filters.video_id);
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const response = await fetch(`/api/watch-ads/stats?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to load stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error('Error loading stats:', err);
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    loadStats();
  };

  const clearFilters = () => {
    setFilters({
      video_id: '',
      user_id: '',
      start_date: '',
      end_date: ''
    });
    setTimeout(loadStats, 100);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-600 mx-auto mb-4" />
          <p className="text-yellow-800 font-medium">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Watch Ads Statistics</h1>
          <p className="text-gray-600">Track which users watched which ads and view detailed analytics</p>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-lg bg-gradient-to-br from-white to-yellow-50">
          <CardHeader className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-t-lg">
            <CardTitle className="flex items-center text-xl font-bold">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="video_id">Video ID (optional)</Label>
                <Input
                  id="video_id"
                  value={filters.video_id}
                  onChange={(e) => handleFilterChange('video_id', e.target.value)}
                  placeholder="Filter by video"
                />
              </div>
              <div>
                <Label htmlFor="user_id">User ID (optional)</Label>
                <Input
                  id="user_id"
                  value={filters.user_id}
                  onChange={(e) => handleFilterChange('user_id', e.target.value)}
                  placeholder="Filter by user"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={applyFilters}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-yellow-900 font-semibold shadow-md"
              >
                Apply Filters
              </Button>
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6 border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="pt-6">
              <p className="text-red-700 font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {stats && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
                <CardContent className="pt-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-800 mb-1">Total Watches</p>
                      <p className="text-3xl font-bold text-yellow-900">{stats.summary.total_watches}</p>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Video className="w-7 h-7 text-yellow-900" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-amber-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
                <CardContent className="pt-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-800 mb-1">Qualified Watches</p>
                      <p className="text-3xl font-bold text-amber-900">{stats.summary.qualified_watches}</p>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="w-7 h-7 text-amber-900" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
                <CardContent className="pt-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-800 mb-1">Total Credits</p>
                      <p className="text-3xl font-bold text-yellow-900">{stats.summary.total_credits_awarded.toFixed(2)}</p>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                      <DollarSign className="w-7 h-7 text-yellow-900" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-amber-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
                <CardContent className="pt-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-800 mb-1">Qualification Rate</p>
                      <p className="text-3xl font-bold text-amber-900">{stats.summary.qualification_rate}%</p>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Users className="w-7 h-7 text-amber-900" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* View Mode Selector */}
            <div className="mb-4">
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger 
                  className="w-48 border-gray-700 focus:border-yellow-500 focus:ring-yellow-500 bg-gray-800 hover:bg-gray-900 text-white"
                >
                  <SelectValue placeholder="Select view" className="text-white" />
                </SelectTrigger>
                <SelectContent 
                  className="bg-gray-800 border-gray-700 text-white"
                >
                  <SelectItem 
                    value="summary" 
                    className="hover:bg-gray-700 focus:bg-gray-700 text-white"
                  >
                    Summary
                  </SelectItem>
                  <SelectItem 
                    value="by_video" 
                    className="hover:bg-gray-700 focus:bg-gray-700 text-white"
                  >
                    By Video
                  </SelectItem>
                  <SelectItem 
                    value="by_user" 
                    className="hover:bg-gray-700 focus:bg-gray-700 text-white"
                  >
                    By User
                  </SelectItem>
                  <SelectItem 
                    value="detailed" 
                    className="hover:bg-gray-700 focus:bg-gray-700 text-white"
                  >
                    Detailed List
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* By Video View */}
            {viewMode === 'by_video' && (
              <div className="space-y-4">
                {stats.by_video.map((video) => (
                  <Card key={video.video_id} className="border-0 shadow-lg bg-gradient-to-br from-white to-yellow-50 hover:shadow-xl transition-all duration-300">
                    <CardHeader className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-t-lg">
                      <CardTitle className="text-xl font-bold">{video.video_title}</CardTitle>
                      <CardDescription className="text-yellow-800">
                        {video.total_watches} total watches • {video.qualified_watches} qualified • {video.total_credits.toFixed(2)} credits
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                          <Users className="w-5 h-5 mr-2 text-yellow-600" />
                          Users who watched:
                        </h4>
                        {video.users.map((user) => (
                          <div key={user.user_id} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 hover:shadow-md transition-all duration-200">
                            <div>
                              <p className="font-semibold text-gray-900">{user.name || user.email}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {user.employee_number && (
                                  <span className="inline-block px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-md text-xs font-medium mr-2">
                                    {user.employee_number}
                                  </span>
                                )}
                                {new Date(user.watched_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              {user.is_qualified ? (
                                <span className="inline-block px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-semibold rounded-lg text-sm shadow-sm">
                                  ✓ Qualified
                                </span>
                              ) : (
                                <span className="inline-block px-3 py-1 bg-gray-200 text-gray-600 font-medium rounded-lg text-sm">
                                  Not Qualified
                                </span>
                              )}
                              <p className="text-sm font-semibold text-yellow-700 mt-1">{user.credits_awarded} credits</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* By User View */}
            {viewMode === 'by_user' && (
              <div className="space-y-4">
                {stats.by_user.map((user) => (
                  <Card key={user.user_id} className="border-0 shadow-lg bg-gradient-to-br from-white to-yellow-50 hover:shadow-xl transition-all duration-300">
                    <CardHeader className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-t-lg">
                      <CardTitle className="text-xl font-bold">{user.user_name || user.user_email}</CardTitle>
                      <CardDescription className="text-yellow-800">
                        {user.employee_number && (
                          <span className="inline-block px-2 py-1 bg-yellow-200 text-yellow-900 rounded-md text-xs font-semibold mr-2">
                            {user.employee_number}
                          </span>
                        )}
                        {user.total_watches} total watches • {user.qualified_watches} qualified • {user.total_credits.toFixed(2)} credits earned
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                          <Video className="w-5 h-5 mr-2 text-yellow-600" />
                          Videos watched:
                        </h4>
                        {user.videos.map((video) => (
                          <div key={video.video_id} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 hover:shadow-md transition-all duration-200">
                            <div>
                              <p className="font-semibold text-gray-900">{video.video_title}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {new Date(video.watched_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              {video.is_qualified ? (
                                <span className="inline-block px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-semibold rounded-lg text-sm shadow-sm">
                                  ✓ Qualified
                                </span>
                              ) : (
                                <span className="inline-block px-3 py-1 bg-gray-200 text-gray-600 font-medium rounded-lg text-sm">
                                  Not Qualified
                                </span>
                              )}
                              <p className="text-sm font-semibold text-yellow-700 mt-1">{video.credits_awarded} credits</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Detailed List View */}
            {viewMode === 'detailed' && (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-yellow-50">
                <CardHeader className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-t-lg">
                  <CardTitle className="text-xl font-bold">Detailed Watch History</CardTitle>
                  <CardDescription className="text-yellow-800">
                    Showing {stats.watches.length} of {stats.pagination.total} records
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-yellow-200">
                          <th className="text-left p-3 font-semibold text-gray-800">User</th>
                          <th className="text-left p-3 font-semibold text-gray-800">Video</th>
                          <th className="text-left p-3 font-semibold text-gray-800">Watched At</th>
                          <th className="text-left p-3 font-semibold text-gray-800">Qualified</th>
                          <th className="text-left p-3 font-semibold text-gray-800">Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.watches.map((watch: any, index: number) => (
                          <tr key={watch.id} className={`border-b border-yellow-100 ${index % 2 === 0 ? 'bg-white' : 'bg-yellow-50'} hover:bg-yellow-100 transition-colors`}>
                            <td className="p-3">
                              <p className="font-semibold text-gray-900">{watch.user?.full_name || watch.user?.email}</p>
                              {watch.user?.employee_number && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-md text-xs font-medium">
                                  {watch.user.employee_number}
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-medium text-gray-800">{watch.video?.title || 'Unknown'}</td>
                            <td className="p-3 text-gray-600">{new Date(watch.created_at).toLocaleString()}</td>
                            <td className="p-3">
                              {watch.is_qualified ? (
                                <span className="inline-block px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-semibold rounded-lg text-sm shadow-sm">
                                  ✓ Yes
                                </span>
                              ) : (
                                <span className="inline-block px-3 py-1 bg-gray-200 text-gray-600 font-medium rounded-lg text-sm">
                                  No
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-yellow-700">{watch.credits_awarded || 0}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

