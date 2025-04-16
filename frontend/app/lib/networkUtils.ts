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
  
  // Default fallbacks
  fallbackUrls = ['http://localhost:3001', 'http://127.0.0.1:3001'];
  return fallbackUrls;
}

/**
 * Test if a URL is reachable
 */
async function isUrlReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second timeout
    
    const response = await fetch(`${url}/api/v1/health`, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
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
 * Creates API URLs based on current network environment
 */
export function getApiBaseUrl() {
  // Use cached value if available
  if (currentApiBaseUrl) {
    // Refresh connection test in the background
    findWorkingApiUrl(currentApiBaseUrl).then(url => {
      if (url !== currentApiBaseUrl) {
        currentApiBaseUrl = url;
      }
    });
    
    return currentApiBaseUrl;
  }
  
  // In browser environment
  if (typeof window !== 'undefined') {
    try {
      // Check for environment variable (set in .env.local)
      if (process.env.NEXT_PUBLIC_API_URL) {
        currentApiBaseUrl = process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '');
        return currentApiBaseUrl;
      }
      
      // Use current hostname with backend port
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = process.env.NEXT_PUBLIC_API_PORT || '3001';
      
      // Create the URL
      const apiUrl = `${protocol}//${hostname}:${port}`;
      
      // Test connection in the background and update if needed
      findWorkingApiUrl(apiUrl).then(url => {
        currentApiBaseUrl = url;
      });
      
      // Return immediate result while test runs in background
      currentApiBaseUrl = apiUrl;
      return apiUrl;
    } catch (error) {
      console.error('Error generating API URL:', error);
      // Fallback to localhost
      currentApiBaseUrl = 'http://localhost:3001';
      return currentApiBaseUrl;
    }
  }
  
  // Default for server-side rendering
  currentApiBaseUrl = 'http://localhost:3001';
  return currentApiBaseUrl;
}

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