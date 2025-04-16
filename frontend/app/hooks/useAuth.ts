'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { LoginFormData, RegisterFormData, UpdateProfileFormData, User } from '../types/auth';
import axios from 'axios';
import { getApiUrl } from '../lib/networkUtils';

// Configure API URL to work across local network
const API_URL = getApiUrl();

console.log(`[useAuth] Using API URL: ${API_URL}`);

// Track refresh token attempts to prevent infinite loops
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

// Function to add new subscribers that will be resolved when token is refreshed
const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// Function to notify all subscribers about the new token
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

export function useAuth() {
  const router = useRouter();
  const { setAuth, clearAuth, updateUser, token } = useAuthStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Setup axios interceptors for token refresh
  useEffect(() => {
    // Setup a request interceptor to add the token to all requests
    const requestInterceptor = axios.interceptors.request.use(
      config => {
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Return a cleanup function
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, [token]);

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (isRefreshing) {
      // Return a promise that resolves when the token is refreshed
      return new Promise(resolve => {
        subscribeTokenRefresh(token => {
          resolve(token);
        });
      });
    }

    isRefreshing = true;
    
    try {
      // In a real implementation, you would call a refresh token endpoint
      // For now, we'll just simulate a token refresh with the current token
      const response = await fetch(`${API_URL}/users/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // If refresh fails, clear auth and redirect to login
        clearAuth();
        router.push('/auth/login');
        return null;
      }
      
      const data = await response.json();
      const newToken = data.token;
      
      // Update auth with new token
      if (data.user) {
        setAuth(newToken, data.user);
      }
      
      // Notify all subscribers about the new token
      onTokenRefreshed(newToken);
      
      return newToken;
    } catch (err) {
      console.error('Failed to refresh token:', err);
      
      // If refresh fails, clear auth
      clearAuth();
      
      return null;
    } finally {
      isRefreshing = false;
    }
  }, [token, clearAuth, router, setAuth]);

  // Login function
  const login = useCallback(async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Login failed');
      }
      
      setAuth(responseData.token, responseData.user);
      toast.success('Logged in successfully');
      
      // Redirect to dashboard after successful login
      router.push('/dashboard');
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      toast.error(err.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [setAuth, router]);

  // Register function
  const register = useCallback(async (data: RegisterFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Registration failed');
      }
      
      setAuth(responseData.token, responseData.user);
      toast.success('Registered successfully');
      
      // Redirect to dashboard after successful registration
      router.push('/dashboard');
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      toast.error(err.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [setAuth, router]);

  // Logout function
  const logout = useCallback(() => {
    clearAuth();
    toast.success('Logged out successfully');
    router.push('/auth/login');
    return true;
  }, [clearAuth, router]);

  // Get user profile function
  const getProfile = useCallback(async (): Promise<User | null> => {
    if (!token) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to get profile');
      }
      
      updateUser(responseData);
      return responseData;
    } catch (err: any) {
      setError(err.message || 'Failed to get profile');
      console.error('Failed to get profile:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, updateUser]);

  // Update profile function
  const updateProfile = useCallback(async (data: UpdateProfileFormData): Promise<User | null> => {
    if (!token) return null;
    
    setLoading(true);
    setError(null);
    
    console.log('Updating profile with data:', data);
    
    try {
      // First update profile data
      const profileResponse = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          specialization: data.specialization,
        }),
      });
      
      const profileData = await profileResponse.json();
      console.log('Profile update response:', profileData);
      
      if (!profileResponse.ok) {
        throw new Error(profileData.message || 'Failed to update profile');
      }
      
      let userData = profileData.user || profileData;
      
      // If there's a profile image, handle it separately
      if (data.profileImage && data.profileImage.startsWith('data:image')) {
        const imageResponse = await fetch(`${API_URL}/users/profile/image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64: data.profileImage
          }),
        });
        
        const imageData = await imageResponse.json();
        
        if (!imageResponse.ok) {
          // Still return profile data even if image upload fails
          console.warn('Image upload failed but profile updated');
        } else {
          // Update with the data including image
          userData = imageData.user || imageData;
        }
      }
      
      console.log('Final user data being stored:', userData);
      
      // Update user in store
      updateUser(userData);
      return userData;
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      console.error('Failed to update profile:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, updateUser]);

  return {
    login,
    register,
    logout,
    getProfile,
    updateProfile,
    refreshToken,
    loading,
    error,
  };
} 