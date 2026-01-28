"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  CreditCard, 
  Recycle, 
  Leaf, 
  TrendingUp,
  AlertCircle,
  Loader2,
  Database
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DashboardData {
  total_pickups: number;
  unique_customers: number;
  unique_collectors: number;
  total_kg_collected: number;
  total_value_generated: number;
  pending_pickups: number;
  approved_pickups: number;
  rejected_pickups: number;
}

export function DashboardMetrics() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscriptions
    const setupRealtimeSubscriptions = () => {
      // Subscribe to pickups changes
      const pickupsSubscription = supabase
        .channel('pickups_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'pickups' }, 
          (payload) => {
            console.log('Pickup change detected:', payload);
            setLastUpdate(new Date());
            fetchDashboardData(); // Refresh data when items change
          }
        )
        .on('presence', { event: 'sync' }, () => {
          setIsRealtimeConnected(true);
        })
        .subscribe();

      // Subscribe to pickup_items changes
      const itemsSubscription = supabase
        .channel('pickup_items_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'pickup_items' }, 
          (payload) => {
            console.log('Pickup item change detected:', payload);
            fetchDashboardData(); // Refresh data when items change
          }
        )
        .subscribe();

      // Subscribe to profiles changes
      const profilesSubscription = supabase
        .channel('profiles_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'profiles' }, 
          (payload) => {
            console.log('Profile change detected:', payload);
            fetchDashboardData(); // Refresh data when profiles change
          }
        )
        .subscribe();

      // Return cleanup function
      return () => {
        pickupsSubscription.unsubscribe();
        itemsSubscription.unsubscribe();
        profilesSubscription.unsubscribe();
      };
    };

    const cleanup = setupRealtimeSubscriptions();

    // Cleanup subscriptions on unmount
    return cleanup;
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo("Testing database connection...");
      
      // First, test basic connection without auth
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (testError) {
        setDebugInfo(`Connection test failed: ${testError.message}`);
        // Don't throw here, just log the error and continue
        console.warn("Connection test failed:", testError);
      } else {
        setDebugInfo("Connection successful, fetching data...");
      }


      
      // Fetch data from basic tables instead of admin views
      const [
        pickupsResult,
        profilesResult
      ] = await Promise.all([
        supabase.from('pickups').select('*'),
        supabase.from('users').select('id, role_id')
      ]);

      setDebugInfo(`Pickups: ${pickupsResult.data?.length || 0}, Profiles: ${profilesResult.data?.length || 0}`);

      // Handle errors gracefully
      if (pickupsResult.error) {
        setDebugInfo(`Pickups error: ${pickupsResult.error.message}`);
        console.warn("Pickups error:", pickupsResult.error);
      }
      if (profilesResult.error) {
        setDebugInfo(`Profiles error: ${profilesResult.error.message}`);
        console.warn("Profiles error:", profilesResult.error);
      }

      const pickups = pickupsResult.data || [];
      const profiles = profilesResult.data || [];

      // Log the raw data for debugging
      console.log("Raw data fetched:", {
        pickups: pickups.length,
        profiles: profiles.length,
        samplePickup: pickups[0],
        sampleProfile: profiles[0]
      });

      // Calculate dashboard data
      const countByRole = (roleName: string) =>
        profiles.filter((p: any) =>
          (p.role && String(p.role).toUpperCase() === roleName) ||
          (p.role_id && String(p.role_id).toUpperCase() === roleName)
        ).length;

      const dashboardData: DashboardData = {
        total_pickups: pickups.length,
        unique_customers: countByRole('CUSTOMER'),
        unique_collectors: countByRole('COLLECTOR'),
        total_kg_collected: pickups.reduce((sum, p) => sum + (p.total_kg || 0), 0),
        total_value_generated: pickups.reduce((sum, p) => sum + (p.total_value || 0), 0),
        pending_pickups: pickups.filter(p => p.status === 'submitted').length,
        approved_pickups: pickups.filter(p => p.status === 'approved').length,
        rejected_pickups: pickups.filter(p => p.status === 'rejected').length
      };

      console.log("Calculated dashboard data:", dashboardData);

      setData(dashboardData);
      setLastUpdate(new Date());
      setDebugInfo(`Data loaded successfully. Pickups: ${dashboardData.total_pickups}, KG: ${dashboardData.total_kg_collected.toFixed(1)}`);
      
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Error loading dashboard data");
      setDebugInfo(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (num: number | null) => {
    if (num === null || num === undefined) return "C 0";
    return `C ${num.toLocaleString()}`;
  };

  const formatWeight = (num: number | null) => {
    if (num === null || num === undefined) return "0 kg";
    if (num >= 1000) return `${(num / 1000).toFixed(1)} tons`;
    return `${num.toFixed(1)} kg`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-elegant">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="p-2 rounded-lg bg-muted animate-pulse">
                  <div className="h-4 w-4 bg-muted rounded" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-20 mb-2 animate-pulse" />
                <div className="flex items-center justify-between">
                  <div className="h-3 bg-muted rounded w-16 animate-pulse" />
                  <div className="h-5 bg-muted rounded w-16 animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
        </div>
        {debugInfo && (
          <div className="text-center text-sm text-muted-foreground">
            {debugInfo}
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={fetchDashboardData}
              className="btn-gradient px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
        {debugInfo && (
          <div className="text-center text-sm text-muted-foreground">
            Debug: {debugInfo}
          </div>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground mb-4">Dashboard data is not available at the moment.</p>
            <button 
              onClick={fetchDashboardData}
              className="btn-gradient px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
        {debugInfo && (
          <div className="text-center text-sm text-muted-foreground">
            Debug: {debugInfo}
          </div>
        )}
      </div>
    );
  }

  // Check if all values are zero
  const allZero = data.total_pickups === 0 && 
                  data.total_kg_collected === 0 && 
                  data.total_value_generated === 0;

  if (allZero) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <Recycle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Recycling Data Yet</h3>
            <p className="text-muted-foreground mb-4">
              The dashboard shows 0 values because there are no pickups or materials in the system yet.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• No pickups have been created</p>
              <p>• No materials have been added</p>
              <p>• No profiles exist in the database</p>
            </div>
            <button 
              onClick={fetchDashboardData}
              className="btn-gradient px-4 py-2 rounded-lg mt-4"
            >
              Refresh Data
            </button>
          </div>
        </div>
        {debugInfo && (
          <div className="text-center text-sm text-muted-foreground">
            Debug: {debugInfo}
          </div>
        )}
      </div>
    );
  }

  const metrics = [
    {
      title: "Total Users",
      value: formatNumber(data.unique_customers + data.unique_collectors),
      change: `${data.unique_customers} customers`,
      icon: Users,
      trend: "up" as const,
      description: "Active recyclers & collectors"
    },
    {
      title: "Pending Pickups", 
      value: formatNumber(data.pending_pickups),
      change: `${data.pending_pickups} awaiting approval`,
      icon: CreditCard,
      trend: data.pending_pickups > 0 ? "alert" as const : "default" as const,
      description: "Pickups submitted"
    },
    {
      title: "Total KG Recycled",
      value: formatWeight(data.total_kg_collected),
      change: `${data.approved_pickups} completed`,
      icon: Recycle,
      trend: "up" as const, 
      description: "Total collected"
    },
    {
      title: "Total Value",
      value: formatCurrency(data.total_value_generated),
      change: `${data.total_pickups} pickups`,
      icon: Leaf,
      trend: "up" as const,
      description: "Value generated"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      {debugInfo && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-blue-700">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span className="text-sm font-medium">Debug Info:</span>
                  <span className="text-sm">{debugInfo}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-xs">
                    {isRealtimeConnected ? 'Live' : 'Connecting...'}
                  </span>
                </div>
                {lastUpdate && (
                  <span className="text-xs text-blue-600">
                    Last update: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <button 
                onClick={fetchDashboardData}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Test Connection
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="shadow-elegant hover:shadow-primary transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${
                  metric.trend === 'up' ? 'bg-success/10' :
                  metric.trend === 'alert' ? 'bg-warning/10' : 'bg-primary/10'
                }`}>
                  <Icon className={`h-4 w-4 ${
                    metric.trend === 'up' ? 'text-success' :
                    metric.trend === 'alert' ? 'text-warning' : 'text-primary'
                  }`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {metric.value}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                  <Badge variant={metric.trend === 'alert' ? 'destructive' : 'default'} className="text-xs">
                    {metric.trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {metric.trend === 'alert' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {metric.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-success rounded-lg">
                <Leaf className="h-5 w-5 text-success-foreground" />
              </div>
              <span>System Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <div className="text-2xl font-bold text-foreground mb-1">
                  {formatNumber(data.total_pickups)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total Pickups
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <div className="text-2xl font-bold text-foreground mb-1">
                  {formatWeight(data.total_kg_collected)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total KG
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <div className="text-2xl font-bold text-foreground mb-1">
                  {formatCurrency(data.total_value_generated)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total Value
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-lg">Pickup Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Pickups</span>
              <span className="text-sm font-medium">{formatNumber(data.total_pickups)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="text-sm font-medium text-warning">{formatNumber(data.pending_pickups)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Approved</span>
              <span className="text-sm font-medium text-success">{formatNumber(data.approved_pickups)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rejected</span>
              <span className="text-sm font-medium text-destructive">{formatNumber(data.rejected_pickups)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Users</span>
              <span className="text-sm font-medium">{formatNumber(data.unique_customers + data.unique_collectors)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button 
          onClick={fetchDashboardData}
          className="btn-gradient px-6 py-2 rounded-lg flex items-center space-x-2"
        >
          <TrendingUp className="h-4 w-4" />
          <span>Refresh Data</span>
        </button>
      </div>
    </div>
  );
}