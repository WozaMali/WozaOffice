# Supabase Integration Guide

This guide explains how to use the new Supabase services that connect your React UI to the installed database schemas.

## 🚀 What's New

Your Supabase database now has comprehensive schemas installed with:
- **User profiles** with role-based access control
- **Address management** with geolocation
- **Material tracking** with dynamic pricing
- **Pickup workflow management**
- **Environmental impact calculations**
- **Fund allocation system**
- **Points and rewards system**
- **Comprehensive analytics views**

## 📊 Available Services

### 1. Dashboard Services (`dashboardServices`)

Connect to the pre-built dashboard views in your database:

```typescript
import { dashboardServices } from '@/lib/supabase-services'

// Get customer dashboard data
const customerData = await dashboardServices.getCustomerDashboard()

// Get collector dashboard data
const collectorData = await dashboardServices.getCollectorDashboard()

// Get admin dashboard data
const adminData = await dashboardServices.getAdminDashboard()
```

### 2. Analytics Services (`analyticsServices`)

Access comprehensive system analytics:

```typescript
import { analyticsServices } from '@/lib/supabase-services'

// Get overall system impact
const systemImpact = await analyticsServices.getSystemImpact()

// Get material performance data
const materialPerformance = await analyticsServices.getMaterialPerformance()

// Get collector performance data
const collectorPerformance = await analyticsServices.getCollectorPerformance()

// Get customer performance data
const customerPerformance = await analyticsServices.getCustomerPerformance()
```

### 3. Core Services

All your existing services are still available:

```typescript
import { 
  profileServices,
  addressServices,
  materialServices,
  pickupServices,
  pickupItemServices,
  pickupPhotoServices,
  paymentServices,
  adminServices,
  realtimeServices
} from '@/lib/supabase-services'
```

## 🎯 Dashboard Data Structure

### Customer Dashboard View
```typescript
interface CustomerDashboardView {
  pickup_id: string
  status: string
  total_kg: number
  total_value: number
  environmental_impact: {
    co2_saved: number
    water_saved: number
    landfill_saved: number
    trees_equivalent: number
  }
  fund_allocation: {
    green_scholar_fund: number
    user_wallet: number
    total_value: number
  }
  total_points: number
  materials_breakdown: Array<{
    material_name: string
    weight_kg: number
    rate_per_kg: number
    value: number
    points: number
    impact: {
      co2_saved: number
      water_saved: number
      landfill_saved: number
      trees_equivalent: number
    }
  }>
  // ... more fields
}
```

### System Impact View
```typescript
interface SystemImpactView {
  total_pickups: number
  unique_customers: number
  unique_collectors: number
  total_kg_collected: number
  total_value_generated: number
  total_co2_saved: number
  total_water_saved: number
  total_landfill_saved: number
  total_trees_equivalent: number
  total_green_scholar_fund: number
  total_user_wallet_fund: number
  total_points_generated: number
  // ... more fields
}
```

## 🔧 How to Use in Your Components

### Example 1: Customer Dashboard

```typescript
import React, { useState, useEffect } from 'react'
import { dashboardServices } from '@/lib/supabase-services'
import type { CustomerDashboardView } from '@/lib/supabase'

export const CustomerDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<CustomerDashboardView[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await dashboardServices.getCustomerDashboard()
        setDashboardData(data)
      } catch (error) {
        console.error('Failed to fetch dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h2>My Recycling Dashboard</h2>
      {dashboardData.map((pickup) => (
        <div key={pickup.pickup_id}>
          <h3>Pickup #{pickup.pickup_id.slice(0, 8)}</h3>
          <p>Status: {pickup.status}</p>
          <p>Total Weight: {pickup.total_kg} kg</p>
          <p>Total Value: R{pickup.total_value}</p>
          <p>Points Earned: {pickup.total_points}</p>
          
          <div>
            <h4>Environmental Impact</h4>
            <p>CO2 Saved: {pickup.environmental_impact.co2_saved} kg</p>
            <p>Water Saved: {pickup.environmental_impact.water_saved} L</p>
            <p>Trees Equivalent: {pickup.environmental_impact.trees_equivalent}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Example 2: Admin Analytics

```typescript
import React, { useState, useEffect } from 'react'
import { analyticsServices } from '@/lib/supabase-services'
import type { SystemImpactView, MaterialPerformanceView } from '@/lib/supabase'

export const AdminAnalytics: React.FC = () => {
  const [systemImpact, setSystemImpact] = useState<SystemImpactView | null>(null)
  const [materialPerformance, setMaterialPerformance] = useState<MaterialPerformanceView[]>([])

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [impact, materials] = await Promise.all([
          analyticsServices.getSystemImpact(),
          analyticsServices.getMaterialPerformance()
        ])
        
        setSystemImpact(impact)
        setMaterialPerformance(materials || [])
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      }
    }

    fetchAnalytics()
  }, [])

  return (
    <div>
      <h2>System Analytics</h2>
      
      {systemImpact && (
        <div>
          <h3>System Overview</h3>
          <p>Total Pickups: {systemImpact.total_pickups}</p>
          <p>Total Weight: {systemImpact.total_kg_collected} kg</p>
          <p>Total Value: R{systemImpact.total_value_generated}</p>
          <p>CO2 Saved: {systemImpact.total_co2_saved} kg</p>
        </div>
      )}

      <div>
        <h3>Material Performance</h3>
        {materialPerformance.map((material) => (
          <div key={material.material_name}>
            <h4>{material.material_name}</h4>
            <p>Total Collected: {material.total_kg_collected} kg</p>
            <p>Total Value: R{material.total_value_generated}</p>
            <p>CO2 Saved: {material.total_co2_saved} kg</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 🎨 Styling with Tailwind CSS

The example components use Tailwind CSS classes. You can customize the styling:

```typescript
// Example styling for dashboard cards
<div className="bg-white rounded-lg shadow-md p-6 mb-4 hover:shadow-lg transition-shadow">
  <h3 className="text-xl font-semibold text-gray-800 mb-4">
    Pickup #{pickup.pickup_id.slice(0, 8)}
  </h3>
  
  <div className="grid grid-cols-2 gap-4">
    <div className="bg-blue-50 p-3 rounded">
      <p className="text-sm text-blue-600">Total Weight</p>
      <p className="text-lg font-bold text-blue-800">{pickup.total_kg} kg</p>
    </div>
    
    <div className="bg-green-50 p-3 rounded">
      <p className="text-sm text-green-600">Total Value</p>
      <p className="text-lg font-bold text-green-800">R{pickup.total_value}</p>
    </div>
  </div>
</div>
```

## 🔐 Authentication & Security

All services automatically use your Supabase authentication:

```typescript
// The services automatically use the authenticated user's context
// No need to pass user IDs manually for user-specific data

// This will automatically fetch data for the current user
const customerData = await dashboardServices.getCustomerDashboard()

// This will fetch all data (admin only)
const adminData = await dashboardServices.getAdminDashboard()
```

## 📱 Real-time Updates

Use the real-time services for live updates:

```typescript
import { realtimeServices } from '@/lib/supabase-services'

useEffect(() => {
  // Subscribe to pickup updates
  const subscription = realtimeServices.subscribeToPickups((payload) => {
    console.log('Pickup updated:', payload)
    // Refresh your data or update UI
  })

  // Cleanup subscription
  return () => {
    subscription.unsubscribe()
  }
}, [])
```

## 🚨 Error Handling

All services include proper error handling:

```typescript
try {
  const data = await dashboardServices.getCustomerDashboard()
  // Handle success
} catch (error) {
  console.error('Failed to fetch dashboard:', error)
  // Handle error (show user message, retry, etc.)
}
```

## 🔄 Data Refresh Strategies

### Option 1: Manual Refresh
```typescript
const [refreshKey, setRefreshKey] = useState(0)

const handleRefresh = () => {
  setRefreshKey(prev => prev + 1)
}

useEffect(() => {
  const fetchData = async () => {
    const data = await dashboardServices.getCustomerDashboard()
    setDashboardData(data)
  }
  
  fetchData()
}, [refreshKey]) // Re-fetch when refreshKey changes
```

### Option 2: Auto-refresh with Interval
```typescript
useEffect(() => {
  const fetchData = async () => {
    const data = await dashboardServices.getCustomerDashboard()
    setDashboardData(data)
  }

  // Initial fetch
  fetchData()

  // Auto-refresh every 30 seconds
  const interval = setInterval(fetchData, 30000)

  return () => clearInterval(interval)
}, [])
```

### Option 3: Real-time with Manual Refresh
```typescript
useEffect(() => {
  const fetchData = async () => {
    const data = await dashboardServices.getCustomerDashboard()
    setDashboardData(data)
  }

  // Initial fetch
  fetchData()

  // Subscribe to real-time updates
  const subscription = realtimeServices.subscribeToPickups(() => {
    fetchData() // Refresh when pickups change
  })

  return () => subscription.unsubscribe()
}, [])
```

## 📋 Available Database Views

Your database now includes these pre-built views:

1. **`customer_dashboard_view`** - Customer-specific pickup data with environmental impact
2. **`collector_dashboard_view`** - Collector-specific pickup data with customer info
3. **`admin_dashboard_view`** - Complete pickup data for admin management
4. **`system_impact_view`** - Overall system statistics and impact
5. **`material_performance_view`** - Material collection performance
6. **`collector_performance_view`** - Collector performance metrics
7. **`customer_performance_view`** - Customer recycling performance

## 🎯 Next Steps

1. **Import the services** into your components
2. **Replace hardcoded data** with real database queries
3. **Add loading states** and error handling
4. **Implement real-time updates** where needed
5. **Customize the UI** to match your design system

## 📚 Additional Resources

- Check `src/lib/supabase-integration-examples.tsx` for complete component examples
- Review your database schema in `schemas/00-install-all.sql`
- Test the services in your Supabase dashboard first
- Use the Supabase client directly for custom queries if needed

## 🆘 Troubleshooting

### Common Issues:

1. **"View does not exist"** - Make sure you've run the schema installation in Supabase
2. **Authentication errors** - Check your Supabase environment variables
3. **Type errors** - Ensure you're importing the correct types
4. **Empty results** - Check if you have data in your database tables

### Debug Tips:

```typescript
// Add logging to see what's happening
const data = await dashboardServices.getCustomerDashboard()
console.log('Dashboard data:', data)

// Check Supabase client connection
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
```

---

Your UI is now fully connected to your Supabase database schemas! 🎉
