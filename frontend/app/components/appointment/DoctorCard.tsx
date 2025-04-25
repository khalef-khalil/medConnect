import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Doctor } from '../../types/appointment';
import { useAuthStore } from '../../store/authStore';

interface DoctorCardProps {
  doctor: Doctor;
}

export default function DoctorCard({ doctor }: DoctorCardProps) {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const defaultProfileImage = '/assets/default-avatar.png';
  const [hasAppointment, setHasAppointment] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if the user has any appointments with this doctor
    const checkAppointments = async () => {
      if (!user || !token) return;

      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/appointments`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const appointments = data.appointments || [];
          
          // Check if any appointments with this doctor exist
          const doctorAppointments = appointments.filter(
            (appointment: any) => appointment.doctorId === doctor.userId
          );
          
          setHasAppointment(doctorAppointments.length > 0);
          
          // Check if any confirmed appointments exist
          const confirmed = doctorAppointments.some(
            (appointment: any) => appointment.status === 'confirmed'
          );
          
          setConfirmedAppointment(confirmed);
        }
      } catch (error) {
        console.error('Error checking appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAppointments();
  }, [doctor.userId, token, user]);

  const handleClick = () => {
    router.push(`/doctors/${doctor.userId}`);
  };

  const startConversation = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Create a conversation ID by sorting user IDs to ensure consistency
    const participants = [user?.userId, doctor.userId].sort();
    const conversationId = `${participants[0]}_${participants[1]}`;
    router.push(`/messages?conversationId=${conversationId}`);
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
          {/* Only show Book Appointment button if no confirmed appointment */}
          {!confirmedAppointment && (
            <button
              className="w-full bg-primary-50 hover:bg-primary-100 text-primary-600 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/appointments/new?doctorId=${doctor.userId}`);
              }}
            >
              Book Appointment
            </button>
          )}
          
          {/* Only show Start Conversation button if has confirmed appointment */}
          {confirmedAppointment && (
            <button
              className="w-full bg-green-50 hover:bg-green-100 text-green-600 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              onClick={startConversation}
            >
              <div className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Start a Conversation
              </div>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
} 