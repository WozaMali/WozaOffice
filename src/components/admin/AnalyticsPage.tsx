'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  Users, 
  Package, 
  TreePine, 
  Leaf, 
  Droplets, 
  Mountain,
  BarChart3,
  Activity,
  Calendar,
  Target
} from 'lucide-react';
import { 
  getSystemImpact, 
  getMaterialPerformance, 
  getCollectorPerformance, 
  getCustomerPerformance,
  getUsers,
  formatCurrency,
  formatWeight,
  formatDate
} from '@/lib/admin-services';
import { exportToCSV, exportToXLSX, exportToPDF } from '@/lib/export-utils';
import { 
  SystemImpactView, 
  MaterialPerformanceView, 
  CollectorPerformanceView, 
  CustomerPerformanceView 
} from '@/lib/supabase';

export default function AnalyticsPage() {
  const [systemImpact, setSystemImpact] = useState<SystemImpactView | null>(null);
  const [materialPerformance, setMaterialPerformance] = useState<MaterialPerformanceView[]>([]);
  const [collectorPerformance, setCollectorPerformance] = useState<CollectorPerformanceView[]>([]);
  const [customerPerformance, setCustomerPerformance] = useState<CustomerPerformanceView[]>([]);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    // Show UI immediately, load data in background
    setLoading(false);
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    // Load in background without blocking UI
    try {
      const [impact, materials, collectors, customers, users] = await Promise.all([
        getSystemImpact(),
        getMaterialPerformance(),
        getCollectorPerformance(),
        getCustomerPerformance(),
        getUsers()
      ]);
      
      setSystemImpact(impact as any);
      setMaterialPerformance(materials as any);
      setCollectorPerformance(collectors as any);
      setCustomerPerformance(customers as any);

      // Align "Active Users" with Users Page (status === 'active')
      const activeCount = (users as any[]).filter((u: any) => u?.is_active).length;
      setActiveUsersCount(activeCount);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  };

  // UI shows immediately, no loading spinner blocking

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Comprehensive system analytics and reporting insights</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-500">Time Range</div>
              <div className="text-lg font-bold text-blue-600 capitalize">{timeRange}</div>
            </div>
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <Card className="border-0 shadow-xl bg-white mb-6">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Calendar className="w-5 h-5" />
              Time Range Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="today">Today</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* System Impact Overview */}
        {systemImpact && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-blue-900">Total Pickups</CardTitle>
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {systemImpact.total_pickups.toLocaleString()}
                </div>
                <p className="text-sm text-blue-700 font-medium">
                  Pending: {systemImpact.pending_pickups}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-green-900">Total Weight</CardTitle>
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <Activity className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {formatWeight(systemImpact.total_kg_collected)}
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
                  {formatCurrency(systemImpact.total_value_generated)}
                </div>
                <p className="text-sm text-purple-700 font-medium">
                  Generated revenue
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-orange-900">Active Users</CardTitle>
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {activeUsersCount.toLocaleString()}
                </div>
                <p className="text-sm text-orange-700 font-medium">
                  Engaged this period: {(systemImpact.unique_customers + systemImpact.unique_collectors).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Environmental Impact */}
        {systemImpact && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-green-900">CO₂ Saved</CardTitle>
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <Leaf className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {systemImpact.total_co2_saved.toFixed(1)} kg
                </div>
                <p className="text-sm text-green-700 font-medium">
                  Carbon dioxide equivalent
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-blue-900">Water Saved</CardTitle>
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <Droplets className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {systemImpact.total_water_saved.toFixed(1)} L
                </div>
                <p className="text-sm text-blue-700 font-medium">
                  Liters of water
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-orange-900">Landfill Saved</CardTitle>
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Mountain className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {formatWeight(systemImpact.total_landfill_saved)}
                </div>
                <p className="text-sm text-orange-700 font-medium">
                  Waste diverted
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-emerald-900">Trees Equivalent</CardTitle>
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <TreePine className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600 mb-1">
                  {systemImpact.total_trees_equivalent.toFixed(1)}
                </div>
                <p className="text-sm text-emerald-700 font-medium">
                  Trees planted equivalent
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Material Performance */}
        <Card className="border-0 shadow-xl bg-white mb-6">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Material Performance
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Performance metrics by material type</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {materialPerformance.length} Materials
                </Badge>
                <div className="flex gap-2">
                  <button className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors" onClick={() => exportToCSV('material_performance.csv', ['Material','Category','Rate/kg','Pickups','Total Weight','Total Value','Avg per Pickup'], materialPerformance.map(m => ({
                    'Material': m.material_name,
                    'Category': m.category,
                    'Rate/kg': m.rate_per_kg,
                    'Pickups': m.pickup_count,
                    'Total Weight': m.total_kg_collected,
                    'Total Value': m.total_value_generated,
                    'Avg per Pickup': m.avg_kg_per_pickup
                  })))}>CSV</button>
                  <button className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors" onClick={() => exportToXLSX('material_performance.xlsx', 'Materials', ['Material','Category','Rate/kg','Pickups','Total Weight','Total Value','Avg per Pickup'], materialPerformance.map(m => ({
                    'Material': m.material_name,
                    'Category': m.category,
                    'Rate/kg': m.rate_per_kg,
                    'Pickups': m.pickup_count,
                    'Total Weight': m.total_kg_collected,
                    'Total Value': m.total_value_generated,
                    'Avg per Pickup': m.avg_kg_per_pickup
                  })), '/Woza Mali logo white.png')}>Excel</button>
                  <button className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors" onClick={() => exportToPDF('Material Performance', 'material_performance.pdf', ['Material','Category','Rate/kg','Pickups','Total Weight','Total Value','Avg per Pickup'], materialPerformance.map(m => ({
                    'Material': m.material_name,
                    'Category': m.category,
                    'Rate/kg': m.rate_per_kg,
                    'Pickups': m.pickup_count,
                    'Total Weight': m.total_kg_collected,
                    'Total Value': m.total_value_generated,
                    'Avg per Pickup': m.avg_kg_per_pickup
                  })), '/Woza Mali logo white.png')}>PDF</button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/kg</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickups</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Weight</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg per Pickup</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {materialPerformance.map((material) => (
                    <tr key={material.material_name} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                            <Package className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{material.material_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className="text-xs font-semibold px-3 py-1 rounded-full shadow-sm bg-gradient-to-r from-green-500 to-green-600 text-white">
                          {material.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                            <TrendingUp className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-bold text-purple-600">{formatCurrency(material.rate_per_kg)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                            <Activity className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{material.pickup_count}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                            <Activity className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{formatWeight(material.total_kg_collected)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                            <TrendingUp className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-bold text-emerald-600">{formatCurrency(material.total_value_generated)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg mr-3">
                            <BarChart3 className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{formatWeight(material.avg_kg_per_pickup)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
      </Card>

      {/* Top Collectors */}
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Top Collectors</h3>
                <p className="text-purple-100 text-sm">Performance ranking of field collectors</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">
              {collectorPerformance.length} Collectors
            </Badge>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors" onClick={() => exportToCSV('top_collectors.csv', ['Collector','Email','Pickups','Weight','Value','CO2 Saved'], collectorPerformance.map(c => ({
              'Collector': c.collector_name,
              'Email': c.collector_email,
              'Pickups': c.total_pickups,
              'Weight': c.total_kg_collected,
              'Value': c.total_value_generated,
              'CO2 Saved': c.total_co2_saved
            })))}>Download CSV</button>
            <button className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors" onClick={() => exportToXLSX('top_collectors.xlsx', 'Collectors', ['Collector','Email','Pickups','Weight','Value','CO2 Saved'], collectorPerformance.map(c => ({
              'Collector': c.collector_name,
              'Email': c.collector_email,
              'Pickups': c.total_pickups,
              'Weight': c.total_kg_collected,
              'Value': c.total_value_generated,
              'CO2 Saved': c.total_co2_saved
            })), '/Woza Mali logo white.png')}>Download Excel</button>
            <button className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors" onClick={() => exportToPDF('Top Collectors', 'top_collectors.pdf', ['Collector','Email','Pickups','Weight','Value','CO2 Saved'], collectorPerformance.map(c => ({
              'Collector': c.collector_name,
              'Email': c.collector_email,
              'Pickups': c.total_pickups,
              'Weight': c.total_kg_collected,
              'Value': c.total_value_generated,
              'CO2 Saved': c.total_co2_saved
            })), '/Woza Mali logo white.png')}>Download PDF</button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {collectorPerformance.slice(0, 6).map((collector, index) => (
              <div key={collector.collector_id} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' : 
                      index === 2 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-lg">{collector.collector_name}</div>
                      <div className="text-sm text-gray-600">{collector.collector_email}</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                      <Activity className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <div className="text-gray-600 text-sm">Pickups</div>
                      <div className="font-bold text-orange-600">{collector.total_pickups}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <Activity className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <div className="text-gray-600 text-sm">Weight</div>
                      <div className="font-bold text-green-600">{formatWeight(collector.total_kg_collected)}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <div className="text-gray-600 text-sm">Value</div>
                      <div className="font-bold text-emerald-600">{formatCurrency(collector.total_value_generated)}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <div className="text-gray-600 text-sm">CO₂ Saved</div>
                      <div className="font-bold text-purple-600">{collector.total_co2_saved.toFixed(1)} kg</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Customers */}
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Top Customers</h3>
                <p className="text-green-100 text-sm">Most active recycling customers</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">
              {customerPerformance.length} Customers
            </Badge>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors" onClick={() => exportToCSV('top_customers.csv', ['Resident','Email','Pickups','Weight','Earned','Wallet'], customerPerformance.map(c => ({
              'Resident': c.customer_name,
              'Email': c.customer_email,
              'Pickups': c.total_pickups,
              'Weight': c.total_kg_recycled,
              'Earned': c.total_value_earned,
              'Wallet': c.total_wallet_balance
            })))}>Download CSV</button>
            <button className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors" onClick={() => exportToXLSX('top_customers.xlsx', 'Residents', ['Resident','Email','Pickups','Weight','Earned','Wallet'], customerPerformance.map(c => ({
              'Resident': c.customer_name,
              'Email': c.customer_email,
              'Pickups': c.total_pickups,
              'Weight': c.total_kg_recycled,
              'Earned': c.total_value_earned,
              'Wallet': c.total_wallet_balance
            })), '/Woza Mali logo white.png')}>Download Excel</button>
            <button className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors" onClick={() => exportToPDF('Top Residents', 'top_residents.pdf', ['Resident','Email','Pickups','Weight','Earned','Wallet'], customerPerformance.map(c => ({
              'Resident': c.customer_name,
              'Email': c.customer_email,
              'Pickups': c.total_pickups,
              'Weight': c.total_kg_recycled,
              'Earned': c.total_value_earned,
              'Wallet': c.total_wallet_balance
            })), '/Woza Mali logo white.png')}>Download PDF</button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {customerPerformance.slice(0, 6).map((customer, index) => (
              <div key={customer.customer_id} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' : 
                      index === 2 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-lg">{customer.customer_name}</div>
                      <div className="text-sm text-gray-600">{customer.customer_email}</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                      <Activity className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <div className="text-gray-600 text-sm">Pickups</div>
                      <div className="font-bold text-orange-600">{customer.total_pickups}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <Activity className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <div className="text-gray-600 text-sm">Weight</div>
                      <div className="font-bold text-green-600">{formatWeight(customer.total_kg_recycled)}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <div className="text-gray-600 text-sm">Earned</div>
                      <div className="font-bold text-emerald-600">{formatCurrency(customer.total_value_earned)}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <div className="text-gray-600 text-sm">Wallet</div>
                      <div className="font-bold text-purple-600">{formatCurrency(customer.total_wallet_balance)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
