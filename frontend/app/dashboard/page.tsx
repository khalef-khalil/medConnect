'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import RouteGuard from '../components/auth/RouteGuard';
import { useAuth } from '../hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { getProfile, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Fetch user profile data on dashboard load
    getProfile().catch(() => {
      // If profile fetch fails, redirect to login
      logout();
    });
  }, [getProfile, logout]);

  // Prepare the welcome message based on role
  const welcomeMessage = () => {
    if (!user) return '';
    
    const time = new Date().getHours();
    let greeting = '';
    
    if (time < 12) greeting = 'Good Morning';
    else if (time < 18) greeting = 'Good Afternoon';
    else greeting = 'Good Evening';
    
    return `${greeting}, ${user.firstName}!`;
  };

  const renderRoleBasedContent = () => {
    if (!user) return null;

    switch (user.role) {
      case 'patient':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <DashboardCard 
              title="Book Appointment"
              description="Schedule a consultation with a doctor"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              onClick={() => router.push('/appointments/new')}
            />
            <DashboardCard 
              title="My Appointments"
              description="View your upcoming and past appointments"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              onClick={() => router.push('/appointments')}
            />
            <DashboardCard 
              title="Messages"
              description="Communicate with your healthcare providers"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              }
              onClick={() => router.push('/messages')}
            />
          </div>
        );
      
      case 'doctor':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <DashboardCard 
              title="Today's Appointments"
              description="View your appointments for today"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              onClick={() => router.push('/appointments/today')}
            />
            <DashboardCard 
              title="Patient Records"
              description="Access your patients' medical records"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              onClick={() => router.push('/patients')}
            />
            <DashboardCard 
              title="Messages"
              description="View and respond to patient messages"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              }
              onClick={() => router.push('/messages')}
            />
          </div>
        );
      
      case 'secretary':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <DashboardCard 
              title="Manage Appointments"
              description="Schedule and manage doctor appointments"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              onClick={() => router.push('/appointments/manage')}
            />
            <DashboardCard 
              title="Doctor Schedule"
              description="View and edit doctor availability"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              onClick={() => router.push('/doctors/schedule')}
            />
            <DashboardCard 
              title="Patient Records"
              description="Access and manage patient information"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              onClick={() => router.push('/patients')}
            />
          </div>
        );
      
      case 'admin':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <DashboardCard 
              title="User Management"
              description="Manage system users and permissions"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              onClick={() => router.push('/admin/users')}
            />
            <DashboardCard 
              title="System Settings"
              description="Configure system settings and preferences"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              onClick={() => router.push('/admin/settings')}
            />
            <DashboardCard 
              title="Analytics"
              description="View system usage and statistics"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              onClick={() => router.push('/admin/analytics')}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <RouteGuard>
      <div className="bg-gray-50 min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              {welcomeMessage()}
            </h1>
            <p className="text-gray-600 mb-8">
              Welcome to your MedConnect dashboard. Here's a summary of your activities and quick access to key features.
            </p>

            {/* Dashboard Cards */}
            {renderRoleBasedContent()}

            {/* Recent Activity Section */}
            <div className="mt-10">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-500 text-center py-4">
                  Your recent activity will appear here once you start using the platform.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </RouteGuard>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function DashboardCard({ title, description, icon, onClick }: DashboardCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: '0 10px 20px rgba(0, 0, 0, 0.05)' }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all duration-200"
      onClick={onClick}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 bg-primary-50 p-3 rounded-lg mr-4">
          <div className="text-primary-600">
            {icon}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-1">{title}</h3>
          <p className="text-gray-500 text-sm">{description}</p>
        </div>
      </div>
    </motion.div>
  );
} 