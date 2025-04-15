'use client';

import React, { ReactNode, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { setHydrated } = useAuthStore();
  
  // Set hydrated state when component mounts
  useEffect(() => {
    setHydrated(true);
    
    // Log hydration state for debugging
    console.log('Auth provider mounted and hydrated');
  }, [setHydrated]);
  
  return <>{children}</>;
} 