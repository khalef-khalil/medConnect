'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';

export default function TopNav() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const defaultProfileImage = '/assets/default-avatar.png';

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  // Get role display name
  const getRoleDisplay = () => {
    if (!user) return '';
    
    switch (user.role) {
      case 'patient':
        return 'Patient';
      case 'doctor':
        return 'Doctor';
      case 'admin':
        return 'Admin';
      default:
        return user.role;
    }
  };

  if (!user) return null;

  return (
    <div className="fixed top-0 right-0 left-0 h-16 bg-white border-b border-gray-200 z-20 ml-[72px] md:ml-[240px]">
      <div className="px-4 h-full flex items-center justify-between">
        <div>
          {/* Breadcrumbs can go here if needed */}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications icon */}
          <button className="p-2 rounded-full hover:bg-gray-100 relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          {/* User profile dropdown */}
          <div className="relative">
            <button 
              className="flex items-center space-x-2 focus:outline-none"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100">
                <Image
                  src={user.profileImage || defaultProfileImage}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="object-cover"
                  fill
                  sizes="32px"
                />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-700">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-500">{getRoleDisplay()}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Dropdown menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Profile
                </Link>
                <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Settings
                </Link>
                <button 
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 