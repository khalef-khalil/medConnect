'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AuthLayout from '../../../components/layout/AuthLayout';
import { usePayments } from '../../../hooks/usePayments';
import { useAppointments } from '../../../hooks/useAppointments';
import { useDoctors } from '../../../hooks/useDoctors';
import { useAuthStore } from '../../../store/authStore';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import NewPaymentForm from '../../../components/payment/NewPaymentForm';
import { v4 as uuidv4 } from 'uuid';

export default function NewProcessPaymentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createNewAppointment } = useAppointments();
  const { doctor, fetchDoctorById } = useDoctors();
  
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [tempAppointmentId, setTempAppointmentId] = useState<string>('');

  // Load appointment data from localStorage
  useEffect(() => {
    const loadAppointmentData = () => {
      try {
        const savedData = localStorage.getItem('pendingAppointment');
        if (!savedData) {
          setError('No appointment data found');
          return;
        }
        
        const parsedData = JSON.parse(savedData);
        
        // Generate temporary appointment ID if not already present
        if (!parsedData.appointmentId) {
          parsedData.appointmentId = uuidv4();
          localStorage.setItem('pendingAppointment', JSON.stringify(parsedData));
        }
        
        setAppointmentData(parsedData);
        setTempAppointmentId(parsedData.appointmentId);
        
        // Also fetch doctor details
        if (parsedData.doctorId) {
          fetchDoctorById(parsedData.doctorId);
        }
      } catch (err) {
        console.error('Error loading appointment data:', err);
        setError('Failed to load appointment data');
      }
    };
    
    loadAppointmentData();
  }, [fetchDoctorById]);

  // Calculate appointment price based on duration
  const getAppointmentPrice = () => {
    if (!appointmentData) return 0;
    
    // Calculate duration in minutes
    const start = new Date(appointmentData.startTime);
    const end = new Date(appointmentData.endTime);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    
    // Base rate of $50 per 30 minutes
    const baseRate = 50;
    return Math.ceil(durationMinutes / 30) * baseRate;
  };

  // Format currency
  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Handle successful payment
  const handlePaymentSuccess = async (paymentResult: any) => {
    if (!appointmentData) {
      setError('No appointment data available');
      return;
    }
    
    setProcessing(true);
    
    try {
      // Add payment information to the appointment data
      const appointmentWithPayment = {
        ...appointmentData,
        appointmentId: paymentResult.appointmentId,
        paymentStatus: 'paid'
      };
      
      // Now create the appointment with the backend
      const result = await createNewAppointment(appointmentWithPayment);
      
      if (result) {
        // Clear the pending appointment from localStorage
        localStorage.removeItem('pendingAppointment');
        
        // Redirect to the appointments page
        router.push('/appointments');
      } else {
        setError('Failed to create appointment. Please try again.');
      }
    } catch (err) {
      console.error('Error creating appointment:', err);
      setError('Error creating appointment after payment');
    } finally {
      setProcessing(false);
    }
  };

  // If user isn't authenticated or isn't a patient, redirect
  if (user?.role !== 'patient') {
    return (
      <AuthLayout>
        <div className="p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 p-6 rounded-xl text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Unauthorized
              </h2>
              <p className="text-gray-600 mb-6">
                You don't have permission to access this page.
              </p>
              <button
                onClick={() => router.push('/appointments')}
                className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                Back to Appointments
              </button>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

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
              Complete Your Payment
            </h1>
            <p className="text-gray-600 mb-8">
              Please provide your payment details to confirm your appointment.
            </p>
            
            {error ? (
              <div className="bg-red-50 p-6 rounded-xl text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  Error
                </h2>
                <p className="text-gray-600 mb-6">
                  {error}
                </p>
                <button
                  onClick={() => router.push('/doctors')}
                  className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  Back to Doctors
                </button>
              </div>
            ) : processing ? (
              <div className="flex flex-col justify-center items-center py-20">
                <LoadingSpinner size="large" />
                <p className="mt-4 text-gray-600">Creating your appointment...</p>
              </div>
            ) : !appointmentData || !doctor ? (
              <div className="flex justify-center items-center py-20">
                <LoadingSpinner size="large" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <NewPaymentForm 
                    amount={getAppointmentPrice()} 
                    doctorId={appointmentData.doctorId}
                    appointmentId={tempAppointmentId}
                    onSuccess={handlePaymentSuccess}
                  />
                </div>
                <div className="bg-gray-50 p-6 rounded-xl h-fit">
                  <h3 className="text-lg font-semibold mb-4">Appointment Summary</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Appointment Type</p>
                      <p className="font-medium">{appointmentData.appointmentType}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Doctor</p>
                      <p className="font-medium">
                        {doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Loading doctor details...'}
                      </p>
                      {doctor && (
                        <p className="text-sm text-gray-500">{doctor.specialization}</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Date & Time</p>
                      <p className="font-medium">
                        {new Date(appointmentData.startTime).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm">
                        {new Date(appointmentData.startTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} - 
                        {new Date(appointmentData.endTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="text-xl font-bold text-primary-700">
                        {formatCurrency(getAppointmentPrice())}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AuthLayout>
  );
} 