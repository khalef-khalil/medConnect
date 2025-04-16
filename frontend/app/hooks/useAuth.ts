'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { LoginFormData, RegisterFormData, UpdateProfileFormData, User } from '../types/auth';

// In a real app, this would be connected to an actual API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function useAuth() {
  const router = useRouter();
  const { setAuth, clearAuth, updateUser, token } = useAuthStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    loading,
    error,
  };
} 