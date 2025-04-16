import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Doctor } from '../../types/appointment';

interface DoctorCardProps {
  doctor: Doctor;
}

export default function DoctorCard({ doctor }: DoctorCardProps) {
  const router = useRouter();
  const defaultProfileImage = '/assets/default-avatar.png';

  const handleClick = () => {
    router.push(`/doctors/${doctor.userId}`);
  };

  return (
    <motion.div
      className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer border border-gray-100 hover:border-primary-100"
      whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
      transition={{ duration: 0.3 }}
      onClick={handleClick}
    >
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 mr-4">
            <Image
              src={doctor.profileImage || defaultProfileImage}
              alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
              className="object-cover"
              fill
              sizes="64px"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Dr. {doctor.firstName} {doctor.lastName}</h3>
            <p className="text-primary-600">{doctor.specialization}</p>
          </div>
        </div>
        
        <div className="mt-2">
          <div className="flex items-center text-gray-600 text-sm mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {doctor.email}
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <button
            className="w-full bg-primary-50 hover:bg-primary-100 text-primary-600 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/appointments/new?doctorId=${doctor.userId}`);
            }}
          >
            Book Appointment
          </button>
          
          <button
            className="w-full bg-green-50 hover:bg-green-100 text-green-600 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/messages/new?doctorId=${doctor.userId}`);
            }}
          >
            <div className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Start a Conversation
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
} 