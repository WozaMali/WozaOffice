'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Users,
  BarChart3,
  Settings,
  List,
  TrendingUp,
  Award,
  User,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import PickupManagement from './PickupManagement';
import CustomerManagement from './CustomerManagement';
import LiveCollectionPopup from './LiveCollectionPopup';
import { 
  getCollectorStats, 
  getCollectorPickups, 
  getMaterials, 
  subscribeToCollectorPickups, 
  subscribeToMaterials,
  testSupabaseConnection,
  checkRequiredTables,
  CollectorStats, 
  CollectorPickup, 
  Material 
} from '../../lib/collector-services';
import { getCollectorId, isUsingDemoData } from '../../lib/collector-config';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function CollectorDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLiveCollectionOpen, setIsLiveCollectionOpen] = useState(false);
  const [liveCollectionData, setLiveCollectionData] = useState({ address: '', customerName: '' });
  
  // Real-time data states
  const [stats, setStats] = useState<CollectorStats | null>(null);
  const [pickups, setPickups] = useState<CollectorPickup[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableStatus, setTableStatus] = useState<{ [key: string]: boolean }>({});
  const [collectorId, setCollectorId] = useState<string>('');

  // Load initial data
  useEffect(() => {
    loadCollectorId();
  }, []);

  // Load collector ID first
  const loadCollectorId = async () => {
    try {
      const id = await getCollectorId();
      setCollectorId(id);
      if (id) {
        loadDashboardData(id);
      } else {
        setError('Collector ID not found. Please check your configuration.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(`Failed to load collector ID: ${err.message}`);
      setIsLoading(false);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!collectorId) return;

    const pickupSubscription = subscribeToCollectorPickups(collectorId, (payload) => {
      console.log('🔄 Pickup change detected:', payload);
      // Reload data when changes are detected
      loadDashboardData(collectorId);
    });

    const materialSubscription = subscribeToMaterials((payload) => {
      console.log('🔄 Material change detected:', payload);
      // Reload materials when changes are detected
      loadMaterials();
    });

    return () => {
      pickupSubscription.unsubscribe();
      materialSubscription.unsubscribe();
    };
  }, [collectorId]);

  const loadDashboardData = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Loading collector dashboard data...');

      // First, test the Supabase connection
      console.log('🔌 Testing Supabase connection...');
      const connectionTest = await testSupabaseConnection();
      console.log('🔌 Connection test result:', connectionTest);
      
      if (!connectionTest.success) {
        const errorMsg = `Database connection failed: ${connectionTest.error}`;
        console.error('❌', errorMsg);
        console.error('❌ Connection test details:', connectionTest.details);
        throw new Error(errorMsg);
      }
      
      console.log('✅ Database connection successful, loading data...');

      // Check if required tables exist
      console.log('🔍 Checking required tables...');
      const tablesCheck = await checkRequiredTables();
      console.log('✅ Tables check result:', tablesCheck);

      if (!tablesCheck.success) {
        const errorMsg = `Required tables not found: ${tablesCheck.error}`;
        console.error('❌', errorMsg);
        console.error('❌ Tables check details:', tablesCheck.details);
        throw new Error(errorMsg);
      }
      console.log('✅ Required tables found, loading data...');
      
      // Store table status for debug panel
      setTableStatus(tablesCheck.tableStatus || {});

      // Load stats and pickups in parallel
      console.log('📊 Loading collector stats...');
      const statsData = await getCollectorStats(id);
      console.log('✅ Stats loaded:', statsData);
      
      console.log('📦 Loading collector pickups...');
      const pickupsData = await getCollectorPickups(id);
      console.log('✅ Pickups loaded:', pickupsData.length);

      setStats(statsData);
      setPickups(pickupsData);
      
      console.log('✅ Dashboard data loaded successfully');
      console.log('📊 Final Stats:', statsData);
      console.log('📦 Final Pickups:', pickupsData.length);
    } catch (err: any) {
      console.error('❌ Error loading dashboard data:', err);
      console.error('❌ Error details:', {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        fullError: err
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load dashboard data';
      
      if (err?.message?.includes('Database connection failed')) {
        errorMessage = `Database connection error: ${err.message}`;
      } else if (err?.message?.includes('permission denied')) {
        errorMessage = 'Permission denied - check database access rights';
      } else if (err?.message?.includes('relation') && err?.message?.includes('does not exist')) {
        errorMessage = 'Database table not found - check schema setup';
      } else if (err?.message?.includes('timeout')) {
        errorMessage = 'Database request timed out - check network connection';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Set default values on error
      setStats({
        totalPickups: 0,
        totalWeight: 0,
        totalValue: 0,
        pendingPickups: 0,
        completedPickups: 0,
        averagePickupValue: 0,
        thisMonthPickups: 0,
        thisMonthWeight: 0,
        thisMonthValue: 0,
      });
      setPickups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMaterials = async () => {
    try {
      console.log('🔄 Loading materials...');
      const materialsData = await getMaterials();
      setMaterials(materialsData);
      console.log(`✅ Materials loaded: ${materialsData.length} items`);
    } catch (err: any) {
      console.error('❌ Error loading materials:', err);
      console.error('❌ Error details:', {
        message: err?.message,
        stack: err?.stack,
        name: err?.name
      });
      setMaterials([]);
    }
  };

  const handleLiveCollection = (address: string, customerName: string) => {
    setLiveCollectionData({ address, customerName });
    setIsLiveCollectionOpen(true);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab onLiveCollection={handleLiveCollection} stats={stats} pickups={pickups} />;
      case 'pickups':
        return <PickupManagement />;
      case 'customers':
        return <CustomerManagement />;
      case 'analytics':
        return <AnalyticsTab stats={stats} pickups={pickups} />;
      case 'profile':
        return <ProfileTab />;
      default:
        return <OverviewTab onLiveCollection={handleLiveCollection} stats={stats} pickups={pickups} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <img 
                src="/w yellow.png" 
                alt="Woza Mali Logo" 
                className="w-6 h-6 md:w-8 md:h-8"
              />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900">Collector Dashboard</h1>
              <p className="text-xs md:text-sm text-gray-600">Field Operations & Pickup Management</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading collector dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <img 
                src="/w yellow.png" 
                alt="Woza Mali Logo" 
                className="w-6 h-6 md:w-8 md:h-8"
              />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900">Collector Dashboard</h1>
              <p className="text-xs md:text-sm text-gray-600">Field Operations & Pickup Management</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-red-600 mb-4">Dashboard Loading Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            
            <div className="space-y-4">
              <Button onClick={() => loadCollectorId()} className="bg-orange-600 hover:bg-orange-700 w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Loading
              </Button>
              
              <div className="text-sm text-gray-500">
                <p className="mb-2">Still having issues?</p>
                <a 
                  href="/collector/test-connection" 
                  target="_blank"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Test Database Connection
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <img 
                src="/w yellow.png" 
                alt="Woza Mali Logo" 
                className="w-6 h-6 md:w-8 md:h-8"
              />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900">Collector Dashboard</h1>
              <p className="text-xs md:text-sm text-gray-600">Field Operations & Pickup Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden md:flex">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                Live Data
              </Badge>
            </div>
            <Button variant="outline" size="sm" className="md:hidden">
              <User className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">Debug Information</span>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href="/collector/test-connection"
              target="_blank"
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test Connection
            </a>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload
            </Button>
          </div>
        </div>
        
        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-2 rounded border">
            <span className="font-medium text-gray-700">Status:</span>
            <span className={`ml-2 ${isLoading ? 'text-yellow-600' : error ? 'text-red-600' : 'text-green-600'}`}>
              {isLoading ? 'Loading...' : error ? 'Error' : 'Ready'}
            </span>
          </div>
          <div className="bg-white p-2 rounded border">
            <span className="font-medium text-gray-700">Stats:</span>
            <span className="ml-2 text-gray-600">
              {stats ? 'Loaded' : 'Not loaded'}
            </span>
          </div>
          <div className="bg-white p-2 rounded border">
            <span className="font-medium text-gray-700">Pickups:</span>
            <span className="ml-2 text-gray-600">
              {pickups ? `${pickups.length} items` : 'Not loaded'}
            </span>
          </div>
        </div>
        
        {/* Configuration Status */}
        <div className="mt-2 p-2 bg-white border rounded">
          <span className="font-medium text-gray-700 text-xs">Configuration:</span>
          <div className="mt-1 flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs ${
              isUsingDemoData() 
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                : 'bg-green-100 text-green-800 border border-green-200'
            }`}>
              {isUsingDemoData() ? 'Demo Mode' : 'Real Collector Mode'}
            </span>
            <span className="text-xs text-gray-600">
              ID: {collectorId || 'Not set'}
            </span>
          </div>
        </div>
        
        {/* Table Status */}
        <div className="mt-2 p-2 bg-white border rounded">
          <span className="font-medium text-gray-700 text-xs">Table Status:</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {Object.entries(tableStatus).map(([tableName, isAvailable]) => (
              <span 
                key={tableName}
                className={`px-2 py-1 rounded text-xs ${
                  isAvailable 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}
              >
                {tableName}: {isAvailable ? '✅' : '❌'}
              </span>
            ))}
          </div>
        </div>
        
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <span className="font-medium text-red-700">Error:</span>
            <span className="ml-2 text-red-600 text-xs">{error}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-6 pb-28 md:pb-6">
        {/* Desktop Navigation */}
        <div className="hidden md:block mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="pickups" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Pickups
              </TabsTrigger>
              <TabsTrigger value="customers" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Customers
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-white via-gray-50 to-white border-t-2 border-orange-200 md:hidden z-50 shadow-2xl backdrop-blur-sm">
          <div className="h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400"></div>
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
                activeTab === 'overview' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'
              }`}
            >
              <TrendingUp className="w-5 h-5 mb-1" />
              <span className="text-xs">Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('pickups')}
              className={`flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
                activeTab === 'pickups' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'
              }`}
            >
              <Package className="w-5 h-5 mb-1" />
              <span className="text-xs">Pickups</span>
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
                activeTab === 'customers' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'
              }`}
            >
              <Users className="w-5 h-5 mb-1" />
              <span className="text-xs">Customers</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
                activeTab === 'analytics' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'
              }`}
            >
              <BarChart3 className="w-5 h-5 mb-1" />
              <span className="text-xs">Stats</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>

      {/* Live Collection Popup */}
              <LiveCollectionPopup
          isOpen={isLiveCollectionOpen}
          onClose={() => setIsLiveCollectionOpen(false)}
          initialData={liveCollectionData}
        />
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ 
  onLiveCollection, 
  stats, 
  pickups 
}: { 
  onLiveCollection: (address: string, customerName: string) => void;
  stats: CollectorStats | null;
  pickups: CollectorPickup[];
}) {
  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading collector data...</p>
        </div>
      </div>
    );
  }

  const recentPickups = pickups.slice(0, 5);
  const hasPickups = pickups.length > 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, Collector!</h2>
              <p className="text-gray-600">Ready to make a difference? Start a new collection or manage existing ones.</p>
            </div>
            <Button
              onClick={() => onLiveCollection('', '')}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              size="lg"
            >
              <Package className="w-4 h-4 mr-2" />
              Live Collection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.totalPickups}
            </div>
            <p className="text-xs text-gray-500">This month: {stats.thisMonthPickups}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalWeight >= 1000 
                ? `${(stats.totalWeight / 1000).toFixed(1)} tons`
                : `${stats.totalWeight.toFixed(1)} kg`
              }
            </div>
            <p className="text-xs text-gray-500">This month: {stats.thisMonthWeight.toFixed(1)} kg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingPickups}
            </div>
            <p className="text-xs text-gray-500">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Live Collection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Quick Live Collection
          </CardTitle>
          <CardDescription>Start a collection for a customer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                placeholder="Enter customer name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Enter address"
                className="mt-1"
              />
            </div>
          </div>
          <Button
            onClick={() => onLiveCollection('', '')}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            <Package className="w-4 h-4 mr-2" />
            Start Live Collection
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="w-5 h-5" />
            Recent Collections
          </CardTitle>
          <CardDescription>
            {hasPickups ? 'Your latest collection activities' : 'Start your first collection to see activity here'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasPickups ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="mb-2">No collections yet</p>
              <p className="text-sm mb-4">Start your first collection to begin tracking your recycling impact!</p>
              <Button
                onClick={() => onLiveCollection('', '')}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Package className="w-4 h-4 mr-2" />
                Start First Collection
              </Button>
            </div>
          ) : (
            <div className="space-y-4 md:gap-6">
              {recentPickups.map((pickup) => (
                <div key={pickup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {pickup.customer?.full_name || 'Unknown Customer'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {pickup.address ? `${pickup.address.line1}, ${pickup.address.suburb}` : 'No address'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={pickup.status === 'approved' ? 'default' : 'secondary'}
                      className={pickup.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {pickup.status}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-1">
                      {pickup.total_kg ? `${pickup.total_kg} kg` : 'No weight'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({ stats, pickups }: { stats: CollectorStats | null; pickups: CollectorPickup[] }) {
  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Collection Performance Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Collection Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total Collections</span>
              <span className="font-bold">{stats.totalPickups}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed</span>
              <span className="font-bold text-green-600">{stats.completedPickups}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending</span>
              <span className="font-bold text-yellow-600">{stats.pendingPickups}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weight Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total Weight</span>
              <span className="font-bold text-green-600">
                {stats.totalWeight >= 1000 
                  ? `${(stats.totalWeight / 1000).toFixed(1)} tons`
                  : `${stats.totalWeight.toFixed(1)} kg`
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span>This Month</span>
              <span className="font-bold text-orange-600">
                {stats.thisMonthWeight.toFixed(1)} kg
              </span>
            </div>
            <div className="flex justify-between">
              <span>Average per Collection</span>
              <span className="font-bold">
                {stats.totalPickups > 0 ? (stats.totalWeight / stats.totalPickups).toFixed(1) : 0} kg
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{stats.thisMonthPickups}</div>
              <p className="text-sm text-gray-600">Collections This Month</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.thisMonthWeight.toFixed(1)}</div>
              <p className="text-sm text-gray-600">Kg Recycled This Month</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.thisMonthPickups > 0 ? (stats.thisMonthWeight / stats.thisMonthPickups).toFixed(1) : 0}
              </div>
              <p className="text-sm text-gray-600">Avg Kg per Collection</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Collection Details</CardTitle>
        </CardHeader>
        <CardContent>
          {pickups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No collections available</p>
              <p className="text-sm mt-2">Start collecting to see your performance data here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pickups.slice(0, 10).map((pickup) => (
                <div key={pickup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{pickup.customer?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">
                      {pickup.address ? `${pickup.address.line1}, ${pickup.address.suburb}` : 'No address'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={pickup.status === 'approved' ? 'default' : 'secondary'}>
                      {pickup.status}
                    </Badge>
                    <p className="text-sm text-gray-600">
                      {pickup.total_kg ? `${pickup.total_kg} kg` : 'No weight'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Profile Tab Component
function ProfileTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Collector Profile</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Name</label>
              <p className="text-gray-900">Demo Collector</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">ID</label>
              <p className="text-gray-900">DEMO-001</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Role</label>
              <p className="text-gray-900">Field Collector</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This is a demo collector profile. In production, this would show real collector information,
            performance metrics, and account settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
