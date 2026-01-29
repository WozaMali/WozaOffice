// Comprehensive logout utilities to ensure proper session clearing
// and prevent auto sign-in

export class LogoutUtils {
  /**
   * Comprehensive logout function that clears all authentication data
   * and prevents auto sign-in
   */
  static async performCompleteLogout(supabase: any): Promise<void> {
    try {
      console.log('🚪 Starting comprehensive logout...');
      
      // 1. Sign out from Supabase - try both global and local scope
      try {
        const { error: globalError } = await supabase.auth.signOut({ scope: 'global' });
        if (globalError) {
          console.warn('Global signout error, trying local:', globalError);
          // Fallback to local signout
          const { error: localError } = await supabase.auth.signOut();
          if (localError) {
            console.error('Local signout also failed:', localError);
          }
        }
        
        // Wait a bit to ensure signOut completes
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify session is cleared
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.warn('Session still exists after signOut, forcing clear...');
          // Force clear by removing all Supabase storage keys
          if (typeof window !== 'undefined') {
            const allKeys = Object.keys(localStorage);
            allKeys.forEach(key => {
              if (key.startsWith('sb-') || key.includes('supabase')) {
                localStorage.removeItem(key);
              }
            });
          }
        }
      } catch (signOutErr) {
        console.error('Signout exception:', signOutErr);
        // Continue with storage cleanup even if signout fails
      }
      
      // 2. Clear all browser storage
      if (typeof window !== 'undefined') {
        try {
          // Clear specific auth keys first (more reliable than clear())
          const authKeys = [
            'sb-mljtjntkddwkcjixkyuy-auth-token',
            'supabase.auth.token',
            'supabase.auth.user',
            'supabase.auth.session',
            'auth-token',
            'user-token',
            'session-token'
          ];
          
          authKeys.forEach(key => {
            try {
              localStorage.removeItem(key);
              sessionStorage.removeItem(key);
            } catch (e) {
              console.warn(`Failed to remove ${key}:`, e);
            }
          });
          
          // Clear all auth-related keys
          this.clearAuthStorage();
          
          // Clear all cookies
          this.clearAllCookies();
          
          // Clear IndexedDB if it exists
          if ('indexedDB' in window) {
            try {
              indexedDB.deleteDatabase('supabase');
              indexedDB.deleteDatabase('sb-mljtjntkddwkcjixkyuy-auth-token');
            } catch (e) {
              console.log('IndexedDB cleanup skipped:', e);
            }
          }
          
          // Finally, clear all storage as last resort
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch (clearErr) {
            console.warn('Full storage clear failed:', clearErr);
          }
        } catch (storageErr) {
          console.error('Storage cleanup error:', storageErr);
          // Don't throw - we still want to complete logout
        }
      }
      
      console.log('✅ Comprehensive logout completed');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Don't throw - allow logout to complete even if there are errors
    }
  }
  
  /**
   * Clear all cookies to prevent auto sign-in
   */
  private static clearAllCookies(): void {
    if (typeof document === 'undefined') return;
    
    const cookies = document.cookie.split(";");
    const domain = window.location.hostname;
    const path = window.location.pathname;
    
    cookies.forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      
      if (name) {
        // Clear with current domain
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${domain}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain}`;
      }
    });
  }
  
  /**
   * Clear any remaining authentication-related storage
   */
  private static clearAuthStorage(): void {
    if (typeof window === 'undefined') return;
    
    // Clear specific auth-related keys
    const authKeys = [
      'sb-mljtjntkddwkcjixkyuy-auth-token',
      'supabase.auth.token',
      'supabase.auth.user',
      'supabase.auth.session',
      'auth-token',
      'user-token',
      'session-token'
    ];
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Clear any keys that contain auth-related terms (more aggressive)
    Object.keys(localStorage).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('auth') || 
          lowerKey.includes('token') || 
          lowerKey.includes('session') ||
          lowerKey.includes('supabase') ||
          lowerKey.startsWith('sb-')) {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // Ignore errors
        }
      }
    });
    
    Object.keys(sessionStorage).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('auth') || 
          lowerKey.includes('token') || 
          lowerKey.includes('session') ||
          lowerKey.includes('supabase') ||
          lowerKey.startsWith('sb-')) {
        try {
          sessionStorage.removeItem(key);
        } catch (e) {
          // Ignore errors
        }
      }
    });
  }
  
  /**
   * Force redirect to home page with cache busting
   */
  static forceRedirectToHome(): void {
    if (typeof window === 'undefined') return;
    
    // Add cache busting parameter
    const timestamp = Date.now();
    // Use replace to clear navigation history and remove any existing URL parameters like 'returnTo'
    window.location.replace(`/admin-login?logout=${timestamp}&nocache=true`);
  }
  
  /**
   * Check if user is properly logged out
   */
  static isLoggedOut(): boolean {
    if (typeof window === 'undefined') return true;
    
    // Check if any auth-related data exists
    const hasAuthData = 
      localStorage.getItem('sb-mljtjntkddwkcjixkyuy-auth-token') ||
      localStorage.getItem('supabase.auth.token') ||
      sessionStorage.getItem('sb-mljtjntkddwkcjixkyuy-auth-token') ||
      sessionStorage.getItem('supabase.auth.token');
    
    return !hasAuthData;
  }
}
