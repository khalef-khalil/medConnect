'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Patient {
  userId: string;
  firstName: string;
  lastName: string;
  waitingSince: number;
}

interface DoctorWaitingRoomProps {
  waitingPatients: Patient[];
  onAdmitPatient: (patientId: string) => void;
}

export default function DoctorWaitingRoom({
  waitingPatients,
  onAdmitPatient,
}: DoctorWaitingRoomProps) {
  const [admittingPatient, setAdmittingPatient] = useState<string | null>(null);

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
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm overflow-hidden p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Waiting Room</h2>
        {waitingPatients.length > 0 && (
          <div className="flex items-center">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-sm font-medium text-red-600">
              {waitingPatients.length} patient{waitingPatients.length !== 1 ? 's' : ''} waiting
            </span>
          </div>
        )}
      </div>
      
      {waitingPatients.length === 0 ? (
        <div className="text-center py-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500">No patients are waiting at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {waitingPatients.map((patient) => (
            <motion.div
              key={patient.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-50 p-4 rounded-lg flex items-center justify-between border-l-4 border-yellow-400"
            >
              <div>
                <h3 className="font-medium text-gray-900">
                  {patient.firstName} {patient.lastName}
                </h3>
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