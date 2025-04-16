'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import SideNav from './SideNav';
import TopNav from './TopNav';
import MobileNav from './MobileNav';

interface AuthLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export default function AuthLayout({ children, fullWidth = false }: AuthLayoutProps) {
  const { isAuthenticated, hydrated } = useAuthStore();
  const router = useRouter();

  // Check if user is authenticated
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, hydrated, router]);

  // If we're not hydrated yet, show nothing
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // If we're hydrated but not authenticated, also show nothing as the redirect will happen
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SideNav is hidden on mobile */}
      <div className="hidden md:block">
        {!fullWidth && <SideNav />}
      </div>
      
      <div className="flex-1 overflow-auto">
        {!fullWidth && <TopNav />}
        
        {/* Main content with padding at the bottom for mobile nav */}
        <main className={`${fullWidth ? "" : "pt-14 md:pt-16"} pb-16 md:pb-0`}>
          {children}
        </main>
        
        {/* Mobile Navigation (hidden on desktop) */}
        {!fullWidth && <MobileNav />}
      </div>
    </div>
  );
} 