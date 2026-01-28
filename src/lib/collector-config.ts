// ============================================================================
// COLLECTOR DASHBOARD CONFIGURATION
// ============================================================================
// This file allows you to easily switch between demo and real collector data

export interface CollectorConfig {
  // Set to false to use real collector data instead of demo data
  useDemoData: boolean;
  
  // Demo collector ID (only used when useDemoData is true)
  demoCollectorId: string;
  
  // Real collector configuration (used when useDemoData is false)
  realCollector: {
    // You can set this to your actual collector's email or ID
    email?: string;
    id?: string;
  };
}

// ============================================================================
// CONFIGURATION OPTIONS
// ============================================================================

// Option 1: Use demo data (for testing/development)
export const DEMO_CONFIG: CollectorConfig = {
  useDemoData: true,
  demoCollectorId: '550e8400-e29b-41d4-a716-446655440001',
  realCollector: {}
};

// Option 2: Use real collector data
export const REAL_COLLECTOR_CONFIG: CollectorConfig = {
  useDemoData: false,
  demoCollectorId: '',
  realCollector: {
    // Option A: Use collector's email (will look up ID automatically)
    email: 'dumisani@wozamali.co.za',
    
    // Option B: Use collector's ID directly (if you know it)
    // id: '123e4567-e89b-12d3-a456-426614174000'
  }
};

// ============================================================================
// ACTIVE CONFIGURATION
// ============================================================================
// Change this line to switch between demo and real data
export const ACTIVE_CONFIG = REAL_COLLECTOR_CONFIG;

import { getCollectorIdByEmail } from './collector-services';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function getCollectorId(): Promise<string> {
  if (ACTIVE_CONFIG.useDemoData) {
    return ACTIVE_CONFIG.demoCollectorId;
  }
  
  // If using real collector, try to get ID by email
  if (ACTIVE_CONFIG.realCollector.email) {
    const collectorId = await getCollectorIdByEmail(ACTIVE_CONFIG.realCollector.email);
    if (collectorId) {
      return collectorId;
    }
  }
  
  // Fallback to ID if provided
  return ACTIVE_CONFIG.realCollector.id || '';
}

export function getCollectorEmail(): string | undefined {
  if (ACTIVE_CONFIG.useDemoData) {
    return undefined;
  }
  
  return ACTIVE_CONFIG.realCollector.email;
}

export function isUsingDemoData(): boolean {
  return ACTIVE_CONFIG.useDemoData;
}

// ============================================================================
// USAGE INSTRUCTIONS
// ============================================================================
/*
To use real collector data instead of demo data:

1. Update the REAL_COLLECTOR_CONFIG above with your collector's information:
   - Set email to your collector's email address
   - Or set id to your collector's UUID if you know it

2. Change the ACTIVE_CONFIG line to:
   export const ACTIVE_CONFIG = REAL_COLLECTOR_CONFIG;

3. If using email, the collector services will automatically look up the ID

4. Make sure your collector profile exists in the database with the correct email/ID

Example:
export const REAL_COLLECTOR_CONFIG: CollectorConfig = {
  useDemoData: false,
  demoCollectorId: '',
  realCollector: {
    email: 'john.collector@wozamali.com',
    // id: '123e4567-e89b-12d3-a456-426614174000' // optional
  }
};
*/
