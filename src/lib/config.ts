// Environment configuration utility
export const config = {
  // Get the main app URL (where users login)
  getMainUrl(): string {
    if (typeof window !== 'undefined') {
      // Client-side: use current origin as base
      const origin = window.location.origin;
      if (origin.includes('localhost')) {
        return 'http://localhost:8080';
      }
      return 'https://wozamali.co.za';
    }
    // Server-side: use environment variable
    return process.env.NEXT_PUBLIC_MAIN_URL || 'https://wozamali.co.za';
  },

  // Get the office app URL (admin dashboard)
  getOfficeUrl(): string {
    if (typeof window !== 'undefined') {
      // Client-side: use current origin as base
      const origin = window.location.origin;
      if (origin.includes('localhost')) {
        return 'http://localhost:8081';
      }
      return 'https://office.wozamali.co.za';
    }
    // Server-side: use environment variable
    return process.env.NEXT_PUBLIC_OFFICE_URL || 'https://office.wozamali.co.za';
  },

  // Get the collector app URL
  getCollectorUrl(): string {
    if (typeof window !== 'undefined') {
      // Client-side: use current origin as base
      const origin = window.location.origin;
      if (origin.includes('localhost')) {
        return 'http://localhost:8082';
      }
      return 'https://collector.wozamali.co.za';
    }
    // Server-side: use environment variable
    return process.env.NEXT_PUBLIC_COLLECTOR_URL || 'https://collector.wozamali.co.za';
  }
};
