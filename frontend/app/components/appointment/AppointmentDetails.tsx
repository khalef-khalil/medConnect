import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Appointment } from '../../types/appointment';
import { useAppointments } from '../../hooks/useAppointments';
import { useAuthStore } from '../../store/authStore';
import { useVideo } from '../../hooks/useVideo';

interface AppointmentDetailsProps {
  appointment: Appointment;
}

export default function AppointmentDetails({ appointment }: AppointmentDetailsProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { updateExistingAppointment, removeAppointment } = useAppointments();
  const { getVideoSession } = useVideo();
  const [loading, setLoading] = useState<boolean>(false);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExists, setSessionExists] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState<boolean>(false);
  
  // New state to handle limited checking
  const [checkCount, setCheckCount] = useState<number>(0);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);
  const [checkLimitReached, setCheckLimitReached] = useState<boolean>(false);
  const checkTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Constants for session checking limits
  const MAX_CHECKS = 3;
  const CHECK_WINDOW = 30000; // 30 seconds window for checks
  
  const isDoctor = () => {
    return user?.role === 'doctor' && user?.userId === appointment.doctorId;
  };
  
  // Reset the check count after the time window expires
  useEffect(() => {
    if (checkLimitReached) {
      checkTimeout.current = setTimeout(() => {
        setCheckCount(0);
        setCheckLimitReached(false);
      }, CHECK_WINDOW);
      
      return () => {
        if (checkTimeout.current) {
          clearTimeout(checkTimeout.current);
        }
      };
    }
  }, [checkLimitReached]);
  
  // Modified useEffect for checking sessions with rate limiting
  useEffect(() => {
    const checkSession = async () => {
      if (!appointment || !isUpcoming() || appointment.status !== 'confirmed') return;
      
      // Only need to check for session if the user is a patient
      if (!isDoctor()) {
        // Check if we've reached the rate limit
        const currentTime = Date.now();
        if (currentTime - lastCheckTime < CHECK_WINDOW) {
          // We're within the check window
          if (checkCount >= MAX_CHECKS) {
            setCheckLimitReached(true);
            return;
          }
        } else {
          // Outside the window, reset the count
          setCheckCount(0);
          setCheckLimitReached(false);
        }
        
        setCheckingSession(true);
        try {
          // Increment check count
          setCheckCount(prev => prev + 1);
          setLastCheckTime(currentTime);
          
          const session = await getVideoSession(appointment.appointmentId);
          setSessionExists(!!session);
          
          // Reset check count if successful
          if (!!session) {
            setCheckCount(0);
            setCheckLimitReached(false);
          }
        } catch (err) {
          console.error('Error checking video session:', err);
        } finally {
          setCheckingSession(false);
        }
      }
    };
    
    checkSession();
    
    // Poll for session existence with rate limiting
    let interval: NodeJS.Timeout | null = null;
    if (!isDoctor() && appointment.status === 'confirmed' && isUpcoming()) {
      interval = setInterval(() => {
        // Check if component is still mounted before proceeding
        if (document.body.contains(document.getElementById(`appointment-${appointment.appointmentId}`)) && !checkLimitReached) {
          checkSession();
        } else if (checkLimitReached) {
          // If we've reached the limit, don't try to check again until the window resets
          console.log(`Check limit reached (${MAX_CHECKS} checks in ${CHECK_WINDOW/1000} seconds). Waiting to reset.`);
        } else if (interval) {
          // Clean up if component is no longer in DOM
          clearInterval(interval);
        }
      }, 15000); // 15 seconds between polls
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [appointment, getVideoSession, checkLimitReached, checkCount, lastCheckTime]);
  
  // Format date and time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Add a helper function to check if the appointment needs confirmation
  const needsConfirmation = (status?: string) => {
    return status === 'pending' || status === 'scheduled';
  };

  // Update the getStatusColor function to handle payment status
  const getStatusColor = (status?: string) => {
    if (!status) {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
    
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

  const getPaymentStatusColor = (status?: string) => {
    if (!status) {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
    
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'refunded':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isUpcoming = () => {
    const now = new Date();
    const appointmentDate = new Date(appointment.startTime);
    return appointmentDate > now && appointment.status !== 'cancelled';
  };

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      setLoading(true);
      setError(null);
      
      const success = await removeAppointment(appointment.appointmentId);
      
      if (success) {
        router.push('/appointments');
      } else {
        setError('Failed to cancel appointment. Please try again.');
        setLoading(false);
      }
    }
  };

  const handleStatusUpdate = async (newStatus: 'confirmed' | 'cancelled') => {
    if (confirm(`Are you sure you want to ${newStatus === 'confirmed' ? 'confirm' : 'deny'} this appointment?`)) {
      setStatusLoading(true);
      setError(null);
      
      const updatedAppointment = await updateExistingAppointment(appointment.appointmentId, {
        status: newStatus
      });
      
      if (updatedAppointment) {
        window.location.reload();
      } else {
        setError(`Failed to ${newStatus === 'confirmed' ? 'confirm' : 'deny'} appointment. Please try again.`);
        setStatusLoading(false);
      }
    }
  };

  // Determine if the join video button should be shown and if it should be enabled
  const showJoinVideoButton = appointment.status === 'confirmed' && isUpcoming();
  const isJoinButtonEnabled = isDoctor() || sessionExists;

  return (
    <motion.div
      id={`appointment-${appointment.appointmentId}`}
      className="bg-white rounded-xl shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{appointment.appointmentType}</h1>
            <p className="text-gray-600">
              {isDoctor() ? (
                <>with {appointment.patientName || 'Patient'}</>
              ) : appointment.doctorDetails ? (
                <>with Dr. {appointment.doctorDetails.firstName} {appointment.doctorDetails.lastName} ({appointment.doctorDetails.specialization || 'General'})</>
              ) : (
                <>
                  with Dr. {appointment.doctorName || 'Unknown'} 
                  <button 
                    className="ml-2 text-primary-600 hover:underline text-sm font-medium"
                    onClick={() => window.location.reload()}
                  >
                    (Refresh details)
                  </button>
                </>
              )}
            </p>
          </div>
          <div className="flex space-x-2">
            {appointment.paymentStatus && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(appointment.paymentStatus)}`}>
                {appointment.paymentStatus.charAt(0).toUpperCase() + appointment.paymentStatus.slice(1)}
              </div>
            )}
            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
              {appointment.status?.charAt(0).toUpperCase() + appointment.status?.slice(1) || 'Unknown'}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-gray-600 font-medium mb-2">Date & Time</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-700">{formatDate(appointment.startTime)}</span>
              </div>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700">{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</span>
              </div>
            </div>
          </div>
          
          {/* Show patient details for doctors */}
          {isDoctor() && appointment.patientDetails && (
            <div>
              <h3 className="text-gray-600 font-medium mb-2">Patient Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-gray-700">{appointment.patientDetails.firstName} {appointment.patientDetails.lastName}</span>
                </div>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-700">{appointment.patientDetails.email}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Show doctor details for patients */}
          {!isDoctor() && appointment.doctorDetails && (
            <div>
              <h3 className="text-gray-600 font-medium mb-2">Doctor Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-gray-700">Dr. {appointment.doctorDetails.firstName} {appointment.doctorDetails.lastName}</span>
                </div>
                <div className="flex items-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <span className="text-gray-700">{appointment.doctorDetails.specialization}</span>
                </div>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-700">{appointment.doctorDetails.email}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {appointment.notes && (
          <div className="mb-8">
            <h3 className="text-gray-600 font-medium mb-2">Notes</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">{appointment.notes}</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}
        
        {/* Add Payment Section */}
        {appointment.paymentStatus === 'pending' && !isDoctor() && (
          <div className="mt-8 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Payment Required</h3>
                <p className="text-gray-600 mb-4 md:mb-0">
                  Please complete your payment to confirm this appointment.
                </p>
              </div>
              <button
                onClick={() => router.push(`/appointments/${appointment.appointmentId}/payment`)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Pay Now
              </button>
            </div>
          </div>
        )}
        
        {appointment.paymentStatus === 'paid' && (
          <div className="mt-8 p-4 border border-green-200 bg-green-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Payment Completed</h3>
                <p className="text-gray-600">
                  This appointment has been fully paid.
                </p>
              </div>
              <button
                onClick={() => router.push(`/payments/history`)}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                View Payment History
              </button>
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {/* Only show action buttons for upcoming appointments */}
          {isUpcoming() && (
            <>
              {/* Show pay now button for patients with pending payments */}
              {appointment.paymentStatus === 'pending' && !isDoctor() && (
                <button
                  onClick={() => router.push(`/appointments/${appointment.appointmentId}/payment`)}
                  className="inline-flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pay Now
                </button>
              )}
              
              {/* Show join video button if appointment is confirmed */}
              {showJoinVideoButton && (
                <button
                  onClick={() => router.push(`/video/${appointment.appointmentId}`)}
                  className={`inline-flex items-center justify-center ${isJoinButtonEnabled ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-300 cursor-not-allowed'} text-white font-medium px-4 py-2 rounded-lg transition-colors`}
                  disabled={!isJoinButtonEnabled}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {isDoctor() ? 'Start Video Call' : (
                    sessionExists ? 'Join Video Call' : 'Waiting for Doctor to Start'
                  )}
                  {checkingSession && !isDoctor() && (
                    <span className="ml-2 animate-pulse">•</span>
                  )}
                </button>
              )}

              {/* Show confirmation buttons for doctors with pending appointments */}
              {isDoctor() && needsConfirmation(appointment.status) && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusUpdate('confirmed')}
                    disabled={statusLoading}
                    className="inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {statusLoading ? (
                      <span className="flex items-center">
                        <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                        Processing...
                      </span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Confirm
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('cancelled')}
                    disabled={statusLoading}
                    className="inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Deny
                  </button>
                </div>
              )}

              {/* Show cancel button for all users with confirmed appointments */}
              {appointment.status !== 'cancelled' && (
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="inline-flex items-center justify-center border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-700 mr-2"></span>
                      Cancelling...
                    </span>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Appointment
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Optional: Show a message when rate limit has been reached */}
      {checkLimitReached && !isDoctor() && !sessionExists && showJoinVideoButton && (
        <div className="mt-3 text-xs text-gray-500 text-right">
          Checking paused to reduce server load. Will resume automatically.
        </div>
      )}
    </motion.div>
  );
}