'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types/auth';
import { motion } from 'framer-motion';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, token, hydrated } = useAuthStore();
  const [authorized, setAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Authentication check
    const authCheck = () => {
      // Don't do anything until hydration is complete
      if (!hydrated) {
        setIsLoading(true);
        return;
      }
      
      setIsLoading(true);
      
      // Check if we're on an auth page
      const isAuthPage = pathname.includes('/auth/');
      
      // If not authenticated and not on auth page, redirect to login
      if (!isAuthenticated && !isAuthPage) {
        setAuthorized(false);
        router.push('/auth/login');
        setIsLoading(false);
        return;
      }

      // If authenticated but on auth page, redirect to dashboard
      if (isAuthenticated && isAuthPage) {
        setAuthorized(false);
        router.push('/dashboard');
        setIsLoading(false);
        return;
      }

      // If role-based access control is enabled
      if (allowedRoles && allowedRoles.length > 0 && user) {
        // Check if user role is allowed
        const hasAllowedRole = allowedRoles.includes(user.role);
        
        if (!hasAllowedRole) {
          setAuthorized(false);
          router.push('/unauthorized');
          setIsLoading(false);
          return;
        }
      }

      setAuthorized(true);
      setIsLoading(false);
    };

    authCheck();
    
    // Set up listener for storage events (for multi-tab coordination)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'auth-storage') {
        // Re-run auth check if auth storage changes
        authCheck();
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [pathname, isAuthenticated, router, user, allowedRoles, token, hydrated]);

  // Show loading or children based on authorization status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex flex-col items-center"
        >
          <div className="w-12 h-12 border-t-4 border-primary-600 border-solid rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
} 