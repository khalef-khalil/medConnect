'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import AuthLayout from '../../components/layout/AuthLayout';
import AppointmentDetails from '../../components/appointment/AppointmentDetails';
import { useAppointments } from '../../hooks/useAppointments';

interface AppointmentPageProps {
  params: {
    id: string;
  };
}

export default function AppointmentPage({ params }: AppointmentPageProps) {
  const router = useRouter();
  const { appointment, loading, error, fetchAppointmentById } = useAppointments();
  const [notFound, setNotFound] = useState<boolean>(false);

  useEffect(() => {
    const getAppointment = async () => {
      const result = await fetchAppointmentById(params.id);
      if (!result) {
        setNotFound(true);
      }
    };

    getAppointment();
  }, [params.id, fetchAppointmentById]);

  if (loading && !appointment) {
    return (
      <AuthLayout>
        <div className="p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (notFound || (error && !appointment)) {
    return (
      <AuthLayout>
        <div className="p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Appointment Not Found</h2>
              <p className="text-gray-600 mb-8">The appointment you're looking for doesn't exist or may have been cancelled.</p>
              <button 
                className="bg-primary-600 text-white px-6 py-3 rounded-lg"
                onClick={() => router.push('/appointments')}
              >
                View All Appointments
              </button>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (!appointment) return null;

  return (
    <AuthLayout>
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <button
              className="flex items-center text-primary-600 mb-6 hover:underline"
              onClick={() => router.push('/appointments')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Appointments
            </button>
            
            <AppointmentDetails appointment={appointment} />
          </motion.div>
        </div>
      </div>
    </AuthLayout>
  );
} 