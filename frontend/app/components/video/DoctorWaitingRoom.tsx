'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

interface Patient {
  userId: string;
  firstName: string;
  lastName: string;
  waitingSince: number;
}

interface DoctorWaitingRoomProps {
  waitingPatients: Patient[];
  onAdmitPatient: (patientId: string) => void;
  appointmentId?: string; // Add appointmentId to support empty state actions
}

export default function DoctorWaitingRoom({
  waitingPatients,
  onAdmitPatient,
  appointmentId,
}: DoctorWaitingRoomProps) {
  const [admittingPatient, setAdmittingPatient] = useState<string | null>(null);
  const [hasNotified, setHasNotified] = useState<boolean>(false);
  const [manualAdmitId, setManualAdmitId] = useState<string>('');
  const [showNewPatientBanner, setShowNewPatientBanner] = useState<boolean>(false);
  
  // Show visible notification when a patient joins
  useEffect(() => {
    if (waitingPatients.length > 0 && !hasNotified) {
      // Show a prominent toast notification
      toast.info('A patient is waiting to join the call!', {
        position: "top-center",
        autoClose: false,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
      
      // Also show a banner in the waiting room
      setShowNewPatientBanner(true);
      
      // Hide the banner after 10 seconds
      setTimeout(() => {
        setShowNewPatientBanner(false);
      }, 10000);
      
      setHasNotified(true);
    } else if (waitingPatients.length === 0) {
      setHasNotified(false);
      setShowNewPatientBanner(false);
    }
  }, [waitingPatients.length, hasNotified]);

  const formatWaitingTime = (waitingSince: number) => {
    const now = Date.now();
    const seconds = Math.floor((now - waitingSince) / 1000);
    
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
  
  const handleAdmitClick = (patientId: string) => {
    console.log(`[DoctorWaitingRoom] Admitting patient: ${patientId}`);
    setAdmittingPatient(patientId);
    onAdmitPatient(patientId);
  };
  
  const handleManualAdmitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualAdmitId) {
      handleAdmitClick(manualAdmitId);
    } else {
      // If no ID is provided, use the appointmentId's patient ID
      // which will be handled in the parent component
      handleAdmitClick("auto-admit");
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm overflow-hidden p-6 relative"
    >
      {/* New patient notification banner */}
      {showNewPatientBanner && (
        <motion.div 
          className="absolute top-0 left-0 right-0 bg-red-600 text-white py-3 px-4 text-center font-bold"
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          exit={{ y: -50 }}
        >
          🔔 New patient waiting! Please admit them to start the call
        </motion.div>
      )}
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Waiting Room</h2>
        {waitingPatients.length > 0 && (
          <motion.div 
            className="flex items-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-sm font-medium text-red-600">
              {waitingPatients.length} patient{waitingPatients.length !== 1 ? 's' : ''} waiting
            </span>
          </motion.div>
        )}
      </div>
      
      {waitingPatients.length === 0 ? (
        <div className="text-center py-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 mb-6">No patients are waiting at the moment.</p>
          
          {/* Manual admit section */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
            <h3 className="text-sm font-medium text-blue-700 mb-2">Can't see the patient?</h3>
            <p className="text-sm text-blue-600 mb-4">
              If the patient says they're waiting but you don't see them here, 
              you can try admitting them manually:
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAdmitClick("auto-admit")}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium 
                         flex items-center justify-center"
              disabled={admittingPatient !== null}
            >
              {admittingPatient ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Admitting...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Auto-Admit Patient from Appointment
                </>
              )}
            </motion.button>
            
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Or enter a specific patient ID:</p>
              <form onSubmit={handleManualAdmitSubmit} className="flex">
                <input
                  type="text"
                  value={manualAdmitId}
                  onChange={(e) => setManualAdmitId(e.target.value)}
                  placeholder="Patient ID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-gray-600 text-white rounded-r-lg text-sm font-medium"
                  disabled={admittingPatient !== null}
                >
                  Admit
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {waitingPatients.map((patient) => (
            <motion.div
              key={patient.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-yellow-50 p-4 rounded-lg flex items-center justify-between border-l-4 border-yellow-400"
            >
              <div>
                <div className="flex items-center mb-1">
                  <h3 className="font-medium text-gray-900">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <span className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full animate-pulse">
                    Waiting to Join
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Waiting for {formatWaitingTime(patient.waitingSince)}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Patient is ready and waiting to be admitted
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Patient ID: {patient.userId.substr(0, 8)}...
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 ${admittingPatient === patient.userId ? 'bg-gray-400' : 'bg-primary-600'} text-white rounded-lg text-sm font-medium flex items-center`}
                onClick={() => handleAdmitClick(patient.userId)}
                disabled={admittingPatient === patient.userId}
              >
                {admittingPatient === patient.userId ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Admitting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    Admit to Call
                  </>
                )}
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}
      
      {waitingPatients.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-700 mb-2">Doctor Instructions</h3>
          <ul className="text-sm text-blue-600 space-y-2">
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Click "Admit to Call" to start the video consultation with the patient</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>The patient will automatically join the call when admitted</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>If admission fails, try refreshing the page and admitting again</span>
            </li>
          </ul>
        </div>
      )}
    </motion.div>
  );
} 