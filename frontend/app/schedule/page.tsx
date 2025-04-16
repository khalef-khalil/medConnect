'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AuthLayout from '../components/layout/AuthLayout';
import { useAuthStore } from '../store/authStore';
import ScheduleList from '../components/schedule/ScheduleList';
import ScheduleForm from '../components/schedule/ScheduleForm';
import { useAuth } from '../hooks/useAuth';

export default function SchedulePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { getProfile } = useAuth();
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);

  useEffect(() => {
    // Verify user is authenticated and is a doctor
    const { hydrated } = useAuthStore.getState();
    
    if (hydrated) {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      if (user.role !== 'doctor') {
        router.push('/unauthorized');
        return;
      }

      // Refresh profile data
      getProfile();
    }
  }, [user, router, getProfile]);

  const toggleAddSchedule = () => {
    setIsAddingSchedule(!isAddingSchedule);
  };

  if (!user) {
    return null; // Loading state
  }

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-4 md:p-8"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">My Schedule</h1>
              <p className="text-gray-600">Manage your availability and working hours</p>
            </div>
            <button
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
              onClick={toggleAddSchedule}
            >
              {isAddingSchedule ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Cancel
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Schedule
                </>
              )}
            </button>
          </div>

          {isAddingSchedule ? (
            <ScheduleForm 
              onCancel={toggleAddSchedule} 
              onSuccess={() => setIsAddingSchedule(false)} 
            />
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <ScheduleList doctorId={user.userId} />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AuthLayout>
  );
} 