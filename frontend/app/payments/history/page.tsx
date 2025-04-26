'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AuthLayout from '../../components/layout/AuthLayout';
import { usePayments } from '../../hooks/usePayments';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import axios from 'axios';
import { API_URL } from '../../config/constants';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

export default function PaymentHistoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { payments, loading, error, getPaymentHistory } = usePayments();
  const { showToast } = useToast();
  const { authToken } = useAuth();
  const [processingRefund, setProcessingRefund] = useState<string | null>(null);
  
  // Add a ref to track if we've already fetched data
  const dataFetchedRef = React.useRef(false);
  
  useEffect(() => {
    // Only fetch once when component mounts
    if (!dataFetchedRef.current) {
      dataFetchedRef.current = true;
      getPaymentHistory();
    }
  }, [getPaymentHistory]);
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format currency
  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Get status badge style
  const getAppointmentStatusClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Handle refund functionality
  const handleRefund = async (paymentId: string) => {
    if (!confirm('Are you sure you want to refund this payment?')) return;
    
    setProcessingRefund(paymentId);
    
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      };
      
      await axios.post(
        `${API_URL}/payments/${paymentId}/refund`,
        { reason: 'Appointment cancelled' },
        config
      );
      
      showToast('Payment refunded successfully', 'success');
      getPaymentHistory(); // Refresh payment history
    } catch (err: any) {
      console.error('Error refunding payment:', err);
      showToast(err.response?.data?.message || 'Error refunding payment', 'error');
    } finally {
      setProcessingRefund(null);
    }
  };
  
  return (
    <AuthLayout>
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                  Payment History
                </h1>
                <p className="text-gray-600">
                  View all your {user?.role === 'doctor' ? 'received' : 'completed'} payments
                </p>
              </div>
              <button
                className="mt-4 md:mt-0 flex items-center text-primary-600 hover:text-primary-700"
                onClick={() => router.back()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <LoadingSpinner size="large" />
              </div>
            ) : error ? (
              <div className="bg-red-50 p-6 rounded-xl text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  Error Loading Payments
                </h2>
                <p className="text-gray-600 mb-6">
                  {error}
                </p>
              </div>
            ) : payments.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  No Payments Found
                </h2>
                <p className="text-gray-600 mb-6">
                  {user?.role === 'doctor' 
                    ? "You haven't received any payments yet." 
                    : "You haven't made any payments yet."}
                </p>
                <button
                  onClick={() => router.push('/appointments')}
                  className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  View Appointments
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {user?.role === 'doctor' ? 'Patient' : 'Doctor'}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Appointment
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.paymentId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(payment.createdAt)}</div>
                            {payment.refundedAt && (
                              <div className="text-xs text-gray-500 mt-1">
                                Refunded: {formatDate(payment.refundedAt)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {payment.userDetails ? (
                              <div className="flex items-center">
                                {payment.userDetails.profileImage ? (
                                  <img
                                    className="h-10 w-10 rounded-full mr-3"
                                    src={payment.userDetails.profileImage}
                                    alt={`${payment.userDetails.firstName} ${payment.userDetails.lastName}`}
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mr-3">
                                    <span className="text-lg font-medium">
                                      {payment.userDetails.firstName?.charAt(0) || '?'}
                                      {payment.userDetails.lastName?.charAt(0) || ''}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {user?.role === 'doctor' ? '' : 'Dr. '}
                                    {payment.userDetails.firstName || 'Unknown'} {payment.userDetails.lastName || 'User'}
                                  </div>
                                  {user?.role === 'doctor' && payment.userDetails.email && (
                                    <div className="text-sm text-gray-500">{payment.userDetails.email}</div>
                                  )}
                                </div>
                              </div>
                            ) : payment.doctorId === 'pending' ? (
                              <div className="text-sm text-gray-500">
                                <span className="px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 text-xs">
                                  Pending Assignment
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mr-3">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                                <div className="text-sm text-gray-500">
                                  User details unavailable
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(payment.amount, payment.currency)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {payment.appointmentDetails ? (
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {payment.appointmentDetails.appointmentType}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatDate(payment.appointmentDetails.startTime)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                {payment.doctorId === 'pending' ? (
                                  <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs">
                                    Direct Payment
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs">
                                    No Appointment
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {payment.status === 'refunded' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full border bg-orange-100 text-orange-800 border-orange-200">
                                Refunded
                              </span>
                            ) : payment.appointmentDetails ? (
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getAppointmentStatusClass(payment.appointmentDetails.status)}`}>
                                {payment.appointmentDetails.status.charAt(0).toUpperCase() + payment.appointmentDetails.status.slice(1)}
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full border bg-gray-100 text-gray-800 border-gray-200">
                                Unknown
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex flex-col space-y-2">
                              <button
                                onClick={() => router.push(`/appointments/${payment.appointmentId}`)}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                View Appointment
                              </button>
                              
                              {user?.role === 'doctor' && 
                               payment.status !== 'refunded' && 
                               payment.appointmentDetails?.status === 'cancelled' && (
                                <button
                                  onClick={() => handleRefund(payment.paymentId)}
                                  disabled={processingRefund === payment.paymentId}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                >
                                  {processingRefund === payment.paymentId ? 'Processing...' : 'Refund Payment'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AuthLayout>
  );
} 