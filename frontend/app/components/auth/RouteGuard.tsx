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
  const { isAuthenticated, user } = useAuthStore();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Authentication check
    const authCheck = () => {
      // If not authenticated and not on auth page, redirect to login
      if (!isAuthenticated && !pathname.includes('/auth/')) {
        setAuthorized(false);
        router.push('/auth/login');
        return;
      }

      // If authenticated but on auth page, redirect to dashboard
      if (isAuthenticated && pathname.includes('/auth/')) {
        setAuthorized(false);
        router.push('/dashboard');
        return;
      }

      // If role-based access control is enabled
      if (allowedRoles && allowedRoles.length > 0 && user) {
        // Check if user role is allowed
        if (!allowedRoles.includes(user.role)) {
          setAuthorized(false);
          router.push('/unauthorized');
          return;
        }
      }

      setAuthorized(true);
    };

    authCheck();
  }, [pathname, isAuthenticated, router, user, allowedRoles]);

  // Show loading or children based on authorization status
  if (!authorized) {
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

  return <>{children}</>;
} 