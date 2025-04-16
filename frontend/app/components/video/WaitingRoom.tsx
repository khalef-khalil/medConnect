'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface WaitingRoomProps {
  doctorName: string;
  appointmentTime: string;
  appointmentType: string;
  onReady: () => void;
  waitingSince?: number;
  isAdmitted?: boolean;
}

export default function WaitingRoom({
  doctorName,
  appointmentTime,
  appointmentType,
  onReady,
  waitingSince,
  isAdmitted = false,
}: WaitingRoomProps) {
  const [waitingTime, setWaitingTime] = useState<number>(0);
  const [hasClickedReady, setHasClickedReady] = useState<boolean>(false);
  const [showTransition, setShowTransition] = useState<boolean>(false);
  const [waitingStatus, setWaitingStatus] = useState<string>(''); // Track waiting state messages
  const [waitingTooLong, setWaitingTooLong] = useState<boolean>(false); // Track if waiting for too long
  
  // Constants for timing checks
  const WAITING_TOO_LONG_THRESHOLD = 30000; // 30 seconds
  
  // If patient is admitted, show a transition animation before redirecting
  useEffect(() => {
    if (isAdmitted) {
      setShowTransition(true);
      // Transition will be handled by parent component
    }
  }, [isAdmitted]);
  
  // Check localStorage to see if user already clicked ready
  useEffect(() => {
    const storedReady = localStorage.getItem('patientReady');
    if (storedReady) {
      try {
        const readyData = JSON.parse(storedReady);
        // Check if it's for the current appointment and not too old (within the last hour)
        const isCurrentAppointment = readyData.appointmentTime === appointmentTime;
        const isRecent = Date.now() - readyData.timestamp < 3600000; // 1 hour
        
        if (isCurrentAppointment && isRecent) {
          setHasClickedReady(true);
          // No need to call onReady again as the polling in parent component will handle it
        } else {
          // Clear outdated data
          localStorage.removeItem('patientReady');
        }
      } catch (e) {
        // Invalid JSON, clear it
        localStorage.removeItem('patientReady');
      }
    }
  }, [appointmentTime]);
  
  // Track waiting time and update status messages
  useEffect(() => {
    if (waitingSince && hasClickedReady) {
      const calculateWaitingTime = () => {
        const now = Date.now();
        const waiting = Math.floor((now - waitingSince) / 1000); // seconds
        setWaitingTime(waiting);
        
        // Update waiting status message based on time elapsed
        if (waiting > 120) { // More than 2 minutes
          setWaitingStatus('The doctor appears to be busy. Please continue to wait or check back later.');
          setWaitingTooLong(true);
        } else if (waiting > 60) { // More than 1 minute
          setWaitingStatus('The doctor may be finishing up with another patient. Please wait...');
        } else if (waiting > 30) { // More than 30 seconds
          setWaitingStatus('Connecting to the doctor. This should only take a moment...');
        } else {
          setWaitingStatus('The doctor will admit you shortly. Please wait...');
        }
      };
      
      calculateWaitingTime();
      const interval = setInterval(calculateWaitingTime, 1000);
      
      return () => clearInterval(interval);
    }
  }, [waitingSince, hasClickedReady]);
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  };
  
  const formatAppointmentTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };
  
  const handleReadyClick = () => {
    setHasClickedReady(true);
    setWaitingStatus('The doctor will admit you shortly. Please wait...');
    
    // Store in localStorage to prevent repeated API calls if user refreshes
    localStorage.setItem('patientReady', JSON.stringify({
      appointmentTime,
      timestamp: Date.now()
    }));
    
    // Call the ready handler
    onReady();
  };
  
  // Handle retry when waiting too long
  const handleRetry = () => {
    setWaitingTooLong(false);
    setWaitingStatus('Retrying connection. Please wait...');
    
    // Reset the waiting timestamp to make it feel like a fresh attempt
    localStorage.setItem('patientReady', JSON.stringify({
      appointmentTime,
      timestamp: Date.now()
    }));
    
    // Call the ready handler again
    onReady();
  };
  
  // If admitted and showing transition animation
  if (showTransition) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-md w-full bg-white rounded-xl shadow-md overflow-hidden p-8 text-center"
        >
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 0 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 text-green-600 mb-4 mx-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Joining Call</h2>
          <p className="text-gray-600 mb-4">You've been admitted by the doctor!</p>
          <div className="flex justify-center">
            <div className="animate-bounce rounded-full h-8 w-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-xl shadow-md overflow-hidden"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-50 text-primary-600 mb-4"
            >
              {hasClickedReady ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {hasClickedReady ? 'Waiting for Doctor' : 'Virtual Waiting Room'}
            </h2>
            <p className="text-gray-600">
              {hasClickedReady 
                ? (waitingStatus || 'The doctor will admit you shortly. Please wait...') 
                : (waitingSince ? `Waiting for ${waitingTime > 0 ? formatTime(waitingTime) : 'a moment'}` : 'Please wait while we prepare your appointment')}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-gray-500">APPOINTMENT WITH</h3>
              <p className="text-gray-900 font-medium">{doctorName}</p>
            </div>
            <div className="mb-3">
              <h3 className="text-sm font-medium text-gray-500">APPOINTMENT TYPE</h3>
              <p className="text-gray-900 font-medium">{appointmentType}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">SCHEDULED TIME</h3>
              <p className="text-gray-900 font-medium">{formatAppointmentTime(appointmentTime)}</p>
            </div>
          </div>
          
          <div className="text-center">
            {hasClickedReady ? (
              <div className="flex flex-col items-center justify-center">
                <div className="mb-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
                </div>
                <p className="text-sm text-gray-700 mb-4">
                  When the doctor admits you, your call will start automatically.
                </p>
                
                {/* Show retry button if waiting too long */}
                {waitingTooLong && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    onClick={handleRetry}
                  >
                    Retry Connection
                  </motion.button>
                )}
              </div>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 w-full bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  onClick={handleReadyClick}
                >
                  I'm Ready for My Appointment
                </motion.button>
                <p className="mt-4 text-sm text-gray-500">
                  The doctor will admit you when they're ready. Please ensure your camera and microphone are working.
                </p>
              </>
            )}
          </div>
        </div>
      </motion.div>
      
      {!hasClickedReady && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 max-w-md text-center"
        >
          <h3 className="text-lg font-medium text-gray-900 mb-3">Preparing for your appointment</h3>
          <ul className="text-left space-y-3">
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Find a quiet, private space for your appointment</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Ensure your device's camera and microphone are working</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Have any relevant medical information or questions ready</span>
            </li>
          </ul>
        </motion.div>
      )}
    </div>
  );
} 