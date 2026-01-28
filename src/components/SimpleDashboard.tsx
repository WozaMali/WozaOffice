'use client';

import React, { useState, useEffect } from 'react';
import { unifiedDataService } from '@/lib/unified-data-service';

interface SimpleStats {
  total_pickups: number;
  total_users: number;
  total_kg: number;
  total_value: number;
  recent_pickups: Array<{
    id: string;
    customer_name: string;
    status: string;
    started_at: string;
    total_kg: number;
    total_value: number;
  }>;
}

export default function SimpleDashboard() {
  const [stats, setStats] = useState<SimpleStats>({
    total_pickups: 0,
    total_users: 0,
    total_kg: 0,
    total_value: 0,
    recent_pickups: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSimpleStats();
    
    // Set up real-time subscription using the unified data service
    const cleanup = unifiedDataService.setupUnifiedRealtimeSubscriptions({
      onPickupChange: (payload) => {
        console.log('🔄 Pickup change detected:', payload);
        fetchSimpleStats(); // Refresh data when pickups change
      },
      onSystemChange: (payload) => {
        console.log('🔄 System change detected:', payload);
        fetchSimpleStats(); // Refresh data when system changes
      }
    });

    return cleanup;
  }, []);

  const fetchSimpleStats = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching dashboard stats...');

      // Use the unified data service for consistent data
      const [pickupsResult, systemStatsResult] = await Promise.all([
        unifiedDataService.getUnifiedPickups({ limit: 10 }),
        unifiedDataService.getUnifiedSystemStats()
      ]);

      if (pickupsResult.error) throw pickupsResult.error;
      if (systemStatsResult.error) throw systemStatsResult.error;

      const pickups = pickupsResult.data || [];
      const systemStats = systemStatsResult.data;

      // Get recent pickups with customer names
      const recentPickups = pickups.slice(0, 5).map(pickup => ({
        id: pickup.id,
        customer_name: pickup.customer.full_name,
        status: pickup.status,
        started_at: pickup.started_at,
        total_kg: pickup.total_kg || 0,
        total_value: pickup.total_value || 0
      }));

      console.log('📊 Dashboard stats fetched:', {
        totalPickups: pickups.length,
        totalUsers: systemStats?.total_users || 0,
        totalKg: systemStats?.total_kg_recycled || 0,
        totalValue: systemStats?.total_value_generated || 0,
        recentPickups: recentPickups.length
      });

      setStats({
        total_pickups: pickups.length,
        total_users: systemStats?.total_users || 0,
        total_kg: systemStats?.total_kg_recycled || 0,
        total_value: systemStats?.total_value_generated || 0,
        recent_pickups: recentPickups
      });
    } catch (err) {
      console.error('❌ Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-4">Dashboard Error</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchSimpleStats}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Live Dashboard</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Pickups</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.total_pickups}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="text-3xl font-bold text-green-600">{stats.total_users}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total KG Recycled</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.total_kg.toFixed(2)} kg</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
            <p className="text-3xl font-bold text-orange-600">C{stats.total_value.toFixed(2)}</p>
          </div>
        </div>

        {/* Recent Pickups */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Collections</h3>
          {stats.recent_pickups.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_pickups.map((pickup) => (
                <div key={pickup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{pickup.customer_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(pickup.started_at).toLocaleDateString()} - {pickup.total_kg.toFixed(2)} kg
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      pickup.status === 'completed' ? 'bg-green-100 text-green-800' :
                      pickup.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      pickup.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {pickup.status}
                    </span>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      C{pickup.total_value.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent collections found</p>
          )}
        </div>

        {/* Debug Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Dashboard Type:</strong> Live (Real-time Updates)</p>
            <p><strong>Data Source:</strong> Unified Data Service</p>
            <p><strong>Real-time:</strong> Active</p>
            <p><strong>Last Updated:</strong> {new Date().toLocaleString()}</p>
            <p><strong>Total Collections:</strong> {stats.total_pickups}</p>
          </div>
          <button
            onClick={fetchSimpleStats}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
