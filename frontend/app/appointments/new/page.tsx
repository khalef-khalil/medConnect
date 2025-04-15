'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import AuthLayout from '../../components/layout/AuthLayout';
import AppointmentForm from '../../components/appointment/AppointmentForm';

export default function NewAppointmentPage() {
  const router = useRouter();

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
              onClick={() => router.back()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              Book an Appointment
            </h1>
            <p className="text-gray-600 mb-8">
              Select a date and time to schedule your appointment.
            </p>
            
            <AppointmentForm />
          </motion.div>
        </div>
      </div>
    </AuthLayout>
  );
} 