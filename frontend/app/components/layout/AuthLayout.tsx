'use client';

import React from 'react';
import NavBar from '../auth/NavBar';
import RouteGuard from '../auth/RouteGuard';
import { UserRole } from '../../types/auth';

interface AuthLayoutProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function AuthLayout({ children, allowedRoles }: AuthLayoutProps) {
  return (
    <RouteGuard allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar />
        <main className="flex-grow">
          {children}
        </main>
      </div>
    </RouteGuard>
  );
} 