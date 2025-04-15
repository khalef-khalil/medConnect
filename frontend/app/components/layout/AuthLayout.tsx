'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import SideNav from './SideNav';
import TopNav from './TopNav';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
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
      <SideNav />
      <div className="flex-1 overflow-auto">
        <TopNav />
        <main className="pt-16">
          {children}
        </main>
      </div>
    </div>
  );
} 