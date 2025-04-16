'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-toastify';
import axios from 'axios';

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const router = useRouter();
  const { token, isAuthenticated, clearAuth, hydrated } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Set up axios interceptors for handling 401 errors
  useEffect(() => {
    // Response interceptor for handling 401s globally
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401 && isAuthenticated) {
          // If we get a 401 and the user is supposedly authenticated,
          // it means the token is invalid or expired
          console.error('Authentication error detected:', error.response.data);
          
          // Clear auth state
          clearAuth();
          
          // Show a message to the user
          toast.error('Your session has expired. Please login again.');
          
          // Redirect to login page
          router.push('/auth/login');
        }
        
        return Promise.reject(error);
      }
    );
    
    // Clean up interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [clearAuth, router, isAuthenticated]);

  // Check if token is valid on initial load
  useEffect(() => {
    if (!hydrated) {
      return; // Wait for hydration to complete
    }
    
    const validateToken = async () => {
      setLoading(true);
      
      if (!token) {
        // No token, no need to validate
        setLoading(false);
        return;
      }
      
      try {
        // Try to access a protected endpoint to verify token
        await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/users/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // If successful, token is valid
        console.log('Token validated successfully');
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          console.error('Token validation failed:', error.response.data);
          
          // Clear auth state
          clearAuth();
          
          // If user was trying to access a protected route, show a message
          const isProtectedRoute = window.location.pathname !== '/auth/login' && 
                                  window.location.pathname !== '/auth/register' &&
                                  window.location.pathname !== '/';
          
          if (isProtectedRoute) {
            toast.error('Your session has expired. Please login again.');
            router.push('/auth/login');
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    validateToken();
  }, [token, clearAuth, router, hydrated]);

  if (!hydrated || loading) {
    // Show a simple loading state while we check authentication
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProvider; 