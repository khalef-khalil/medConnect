'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AuthLayout from '../../../components/layout/AuthLayout';
import PaymentForm from '../../../components/payment/PaymentForm';
import { useAppointments } from '../../../hooks/useAppointments';
import { useAuth } from '../../../hooks/useAuth';
import { Appointment } from '../../../types/appointment';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

export default function AppointmentPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id as string;
  const { user } = useAuth();
  const { appointment, loading, error, fetchAppointmentById } = useAppointments();
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (appointmentId) {
      fetchAppointmentById(appointmentId);
    }
  }, [appointmentId, fetchAppointmentById]);

  useEffect(() => {
    // Verify that the user is the patient for this appointment
    if (appointment && user && appointment.patientId !== user.userId) {
      setPageError('You can only make payments for your own appointments');
    }

    // Check if payment has already been made
    if (appointment && appointment.paymentStatus === 'paid') {
      setPageError('This appointment has already been paid for');
    }
  }, [appointment, user]);

  const handlePaymentSuccess = () => {
    router.push(`/appointments/${appointmentId}`);
  };

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
              Payment for Appointment
            </h1>
            <p className="text-gray-600 mb-8">
              Complete your payment to confirm your appointment.
            </p>
            
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <LoadingSpinner size="large" />
              </div>
            ) : error || pageError ? (
              <div className="bg-red-50 p-6 rounded-xl text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  Unable to Process Payment
                </h2>
                <p className="text-gray-600 mb-6">
                  {error || pageError}
                </p>
                <button
                  onClick={() => router.push('/appointments')}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg"
                >
                  View All Appointments
                </button>
              </div>
            ) : appointment ? (
              <PaymentForm 
                appointment={appointment as Appointment} 
                onSuccess={handlePaymentSuccess} 
              />
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500">Appointment not found.</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AuthLayout>
  );
} 