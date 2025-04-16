/**
 * Network utilities for detecting and managing IP addresses
 */

// Keep track of the current API base URL
let currentApiBaseUrl = '';
let fallbackUrls: string[] = [];
let isTestingConnection = false;

/**
 * Get the local network address of the current device
 * This will be used when accessing the app from other devices on the same network
 */
export async function getLocalNetworkIp(): Promise<string> {
  try {
    // For browser environments - we use the server hostname
    if (typeof window !== 'undefined') {
      return window.location.hostname;
    }
    
    // For server environments - we'll use the host that Next.js is running on
    return 'localhost';
  } catch (error) {
    console.error('Error detecting network IP:', error);
    return 'localhost';
  }
}

/**
 * Parse fallback URLs from environment variable
 */
function getFallbackUrls(): string[] {
  if (fallbackUrls.length > 0) {
    return fallbackUrls;
  }
  
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_FALLBACK_URLS) {
    fallbackUrls = process.env.NEXT_PUBLIC_API_FALLBACK_URLS.split(',').map(url => url.trim());
    return fallbackUrls;
  }
  
  // Default fallbacks including both HTTP and HTTPS
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  
  if (protocol === 'https:') {
    // When frontend is HTTPS, prefer HTTPS fallbacks first
    fallbackUrls = [
      'https://localhost:3443', 
      'https://127.0.0.1:3443',
      'http://localhost:3001', 
      'http://127.0.0.1:3001'
    ];
  } else {
    // When frontend is HTTP, prefer HTTP fallbacks first
    fallbackUrls = [
      'http://localhost:3001', 
      'http://127.0.0.1:3001',
      'https://localhost:3443', 
      'https://127.0.0.1:3443'
    ];
  }
  
  return fallbackUrls;
}

/**
 * Test if a URL is reachable
 */
async function isUrlReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second timeout
    
    // Try both health endpoints to ensure compatibility
    const healthEndpoints = ['/api/v1/health', '/health'];
    
    for (const endpoint of healthEndpoints) {
      try {
        const response = await fetch(`${url}${endpoint}`, { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        if (response.ok) {
          clearTimeout(timeoutId);
          return true;
        }
      } catch (err) {
        // Continue to the next endpoint
        console.log(`Health check failed for ${url}${endpoint}`);
      }
    }
    
    clearTimeout(timeoutId);
    return false;
  } catch (err) {
    return false;
  }
}

/**
 * Try each fallback URL until a working one is found
 */
async function findWorkingApiUrl(currentUrl: string): Promise<string> {
  if (isTestingConnection) return currentUrl;
  
  isTestingConnection = true;
  
  try {
    // First try the current URL
    if (await isUrlReachable(currentUrl)) {
      isTestingConnection = false;
      return currentUrl;
    }
    
    // If that fails, try each fallback URL
    const fallbacks = getFallbackUrls();
    for (const fallbackUrl of fallbacks) {
      if (await isUrlReachable(fallbackUrl)) {
        console.log(`Switched to working API URL: ${fallbackUrl}`);
        isTestingConnection = false;
        return fallbackUrl;
      }
    }
    
    // If all fallbacks fail, return the current URL anyway
    console.warn('All API URLs failed, using original URL');
    return currentUrl;
  } catch (error) {
    console.error('Error finding working API URL:', error);
    return currentUrl;
  } finally {
    isTestingConnection = false;
  }
}

/**
 * Gets the base URL for API requests dynamically, handling HTTPS and fallbacks
 */
export const getApiBaseUrl = (): string => {
  // Use Next.js public runtime configuration
  const apiPort = process.env.NEXT_PUBLIC_API_PORT || '3001';
  const apiHttpsPort = process.env.NEXT_PUBLIC_API_HTTPS_PORT || '3443';
  const useDynamicIp = process.env.NEXT_PUBLIC_USE_DYNAMIC_IP === 'true';
  
  // Get fallback URLs from environment
  const fallbackUrls = process.env.NEXT_PUBLIC_API_FALLBACK_URLS?.split(',') || [];
  
  // Default to current window location for hostname (works in browser only)
  let baseUrl = '';
  
  // In browser context
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // Always prefer HTTPS for video calls to get camera/mic permissions
    const useHttps = protocol === 'https:';
    const port = useHttps ? apiHttpsPort : apiPort;
    
    // Build the base URL
    baseUrl = `${useHttps ? 'https' : 'http'}://${hostname}:${port}`;
    
    // Validate created URL with a simple regex
    if (!/^(http|https):\/\/[^\s$.?#].[^\s]*$/.test(baseUrl)) {
      console.warn(`[networkUtils] Generated invalid base URL: ${baseUrl}, falling back to localhost`);
      baseUrl = useHttps ? `https://localhost:${apiHttpsPort}` : `http://localhost:${apiPort}`;
    }
    
    // Log which URL we're using
    console.log(`[networkUtils] Using API base URL: ${baseUrl} (${useHttps ? 'HTTPS' : 'HTTP'})`);
  } else {
    // Server-side rendering - use localhost
    baseUrl = `http://localhost:${apiPort}`;
  }
  
  return baseUrl;
};

/**
 * Utility to check if the current environment is in development mode
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Get full API URL with /api/v1 path
 */
export function getApiUrl() {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/api/v1`;
}

/**
 * Get WebSocket URL
 */
export function getWebsocketUrl() {
  if (typeof window !== 'undefined') {
    try {
      // Use same host as API but with ws/wss protocol
      const baseUrl = getApiBaseUrl();
      const url = new URL(baseUrl);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${url.host}`;
    } catch (error) {
      console.error('Error generating WebSocket URL:', error);
      // Fallback to localhost
      return 'ws://localhost:3001';
    }
  }
  
  return 'ws://localhost:3001';
} 