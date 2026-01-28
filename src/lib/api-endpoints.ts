import { unifiedDataService } from './unified-data-service';

// API Response wrapper for consistent structure
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  endpoint: string;
}

// API Endpoints class for external consumption
export class ApiEndpoints {
  private static instance: ApiEndpoints;
  
  public static getInstance(): ApiEndpoints {
    if (!ApiEndpoints.instance) {
      ApiEndpoints.instance = new ApiEndpoints();
    }
    return ApiEndpoints.instance;
  }

  // Generic response wrapper
  private createResponse<T>(
    success: boolean, 
    endpoint: string,
    data?: T, 
    error?: string
  ): ApiResponse<T> {
    return {
      success,
      data,
      error,
      timestamp: new Date().toISOString(),
      endpoint
    };
  }

  // Get all pickups with optional filtering
  async getPickups(filters?: {
    status?: string;
    customer_id?: string;
    collector_id?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[] | undefined>> {
    try {
      const result = await unifiedDataService.getUnifiedPickups(filters);
      
      if (result.error) {
        return this.createResponse(false, '/api/admin/pickups', undefined, result.error);
      }
      
      return this.createResponse(true, '/api/admin/pickups', result.data);
    } catch (error: any) {
      return this.createResponse(false, '/api/admin/pickups', undefined, error.message);
    }
  }

  // Get pickup by ID
  async getPickupById(id: string): Promise<ApiResponse<any | undefined>> {
    try {
      const result = await unifiedDataService.getUnifiedPickups({ limit: 1 });
      const pickup = result.data.find(p => p.id === id);
      
      if (!pickup) {
        return this.createResponse(false, `/api/admin/pickups/${id}`, undefined, 'Pickup not found');
      }
      
      return this.createResponse(true, `/api/admin/pickups/${id}`, pickup);
    } catch (error: any) {
      return this.createResponse(false, `/api/admin/pickups/${id}`, undefined, error.message);
    }
  }

  // Get all customers
  async getCustomers(filters?: {
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[] | undefined>> {
    try {
      const result = await unifiedDataService.getUnifiedCustomers(filters);
      
      if (result.error) {
        return this.createResponse(false, '/api/admin/customers', undefined, result.error);
      }
      
      return this.createResponse(true, '/api/admin/customers', result.data);
    } catch (error: any) {
      return this.createResponse(false, '/api/admin/customers', undefined, error.message);
    }
  }

  // Get customer by ID
  async getCustomerById(id: string): Promise<ApiResponse<any | undefined>> {
    try {
      const result = await unifiedDataService.getUnifiedCustomers({ limit: 1 });
      const customer = result.data.find(c => c.id === id);
      
      if (!customer) {
        return this.createResponse(false, `/api/admin/customers/${id}`, undefined, 'Customer not found');
      }
      
      return this.createResponse(true, `/api/admin/customers/${id}`, customer);
    } catch (error: any) {
      return this.createResponse(false, `/api/admin/customers/${id}`, undefined, error.message);
    }
  }

  // Get all collectors
  async getCollectors(filters?: {
    is_active?: boolean;
    is_available?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[] | undefined>> {
    try {
      const result = await unifiedDataService.getUnifiedCollectors(filters);
      
      if (result.error) {
        return this.createResponse(false, '/api/admin/collectors', undefined, result.error);
      }
      
      return this.createResponse(true, '/api/admin/collectors', result.data);
    } catch (error: any) {
      return this.createResponse(false, '/api/admin/collectors', undefined, error.message);
    }
  }

  // Get collector by ID
  async getCollectorById(id: string): Promise<ApiResponse<any | undefined>> {
    try {
      const result = await unifiedDataService.getUnifiedCollectors({ limit: 1 });
      const collector = result.data.find(c => c.id === id);
      
      if (!collector) {
        return this.createResponse(false, `/api/admin/collectors/${id}`, undefined, 'Collector not found');
      }
      
      return this.createResponse(true, `/api/admin/collectors/${id}`, collector);
    } catch (error: any) {
      return this.createResponse(false, `/api/admin/collectors/${id}`, undefined, error.message);
    }
  }

  // Get system statistics
  async getSystemStats(): Promise<ApiResponse<any | undefined>> {
    try {
      const result = await unifiedDataService.getUnifiedSystemStats();
      
      if (result.error) {
        return this.createResponse(false, '/api/admin/system/stats', undefined, result.error);
      }
      
      return this.createResponse(true, '/api/admin/system/stats', result.data);
    } catch (error: any) {
      return this.createResponse(false, '/api/admin/system/stats', undefined, error.message);
    }
  }

  // Get dashboard data (combined view)
  async getDashboardData(role: 'ADMIN' | 'COLLECTOR', userId?: string): Promise<ApiResponse<any | undefined>> {
    try {
      const [pickupsResult, customersResult, collectorsResult, statsResult] = await Promise.all([
        unifiedDataService.getUnifiedPickups({
          limit: 50,
          ...(role === 'COLLECTOR' && userId && { collector_id: userId })
        }),
        unifiedDataService.getUnifiedCustomers({ limit: 50 }),
        unifiedDataService.getUnifiedCollectors({ limit: 50 }),
        unifiedDataService.getUnifiedSystemStats()
      ]);

      if (pickupsResult.error || customersResult.error || collectorsResult.error || statsResult.error) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData = {
        pickups: pickupsResult.data,
        customers: customersResult.data,
        collectors: collectorsResult.data,
        systemStats: statsResult.data,
        role,
        timestamp: new Date().toISOString()
      };

      return this.createResponse(true, '/api/admin/dashboard', dashboardData);
    } catch (error: any) {
      return this.createResponse(false, '/api/admin/dashboard', undefined, error.message);
    }
  }

  // Search functionality
  async search(query: string, type: 'pickups' | 'customers' | 'collectors' | 'all'): Promise<ApiResponse<any | undefined>> {
    try {
      const results: any = {};

      if (type === 'pickups' || type === 'all') {
        const pickupsResult = await unifiedDataService.getUnifiedPickups({ limit: 100 });
        if (!pickupsResult.error) {
          results.pickups = pickupsResult.data.filter(p => 
            p.customer.full_name.toLowerCase().includes(query.toLowerCase()) ||
            p.address.line1.toLowerCase().includes(query.toLowerCase()) ||
            p.address.suburb.toLowerCase().includes(query.toLowerCase()) ||
            p.address.city.toLowerCase().includes(query.toLowerCase())
          );
        }
      }

      if (type === 'customers' || type === 'all') {
        const customersResult = await unifiedDataService.getUnifiedCustomers({ limit: 100 });
        if (!customersResult.error) {
          results.customers = customersResult.data.filter(c => 
            c.full_name.toLowerCase().includes(query.toLowerCase()) ||
            c.email.toLowerCase().includes(query.toLowerCase())
          );
        }
      }

      if (type === 'collectors' || type === 'all') {
        const collectorsResult = await unifiedDataService.getUnifiedCollectors({ limit: 100 });
        if (!collectorsResult.error) {
          results.collectors = collectorsResult.data.filter(c => 
            c.full_name.toLowerCase().includes(query.toLowerCase()) ||
            c.email.toLowerCase().includes(query.toLowerCase())
          );
        }
      }

      return this.createResponse(true, `/api/admin/search?q=${query}&type=${type}`, results);
    } catch (error: any) {
      return this.createResponse(false, `/api/admin/search?q=${query}&type=${type}`, undefined, error.message);
    }
  }

  // Get analytics data
  async getAnalytics(timeRange: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<any | undefined>> {
    try {
      const statsResult = await unifiedDataService.getUnifiedSystemStats();
      
      if (statsResult.error) {
        throw new Error('Failed to fetch analytics data');
      }

      // Calculate time-based analytics
      const now = new Date();
      const timeRanges = {
        day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      };

      const analyticsData = {
        timeRange,
        currentStats: statsResult.data,
        trends: {
          pickupsGrowth: Math.random() * 20 - 10, // Mock data - replace with real calculations
          revenueGrowth: Math.random() * 15 - 5,
          customerGrowth: Math.random() * 25 - 15,
          efficiencyScore: Math.random() * 40 + 60
        },
        topPerformers: {
          topCustomers: [], // Would be populated with real data
          topCollectors: [], // Would be populated with real data
          topMaterials: [] // Would be populated with real data
        },
        generatedAt: new Date().toISOString()
      };

      return this.createResponse(true, `/api/admin/analytics?range=${timeRange}`, analyticsData);
    } catch (error: any) {
      return this.createResponse(false, `/api/admin/analytics?range=${timeRange}`, undefined, error.message);
    }
  }

  // Health check endpoint
  async healthCheck(): Promise<ApiResponse<any | undefined>> {
    try {
      const statsResult = await unifiedDataService.getUnifiedSystemStats();
      
      const healthData = {
        status: 'healthy',
        database: statsResult.error ? 'disconnected' : 'connected',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime ? Math.floor(process.uptime()) : 0
      };

      return this.createResponse(true, '/api/admin/health', healthData);
    } catch (error: any) {
      return this.createResponse(false, '/api/admin/health', undefined, error.message);
    }
  }
}

// Export singleton instance
export const apiEndpoints = ApiEndpoints.getInstance();
