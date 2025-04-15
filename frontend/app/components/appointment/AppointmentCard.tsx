import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Appointment, AppointmentStatus } from '../../types/appointment';

interface AppointmentCardProps {
  appointment: Appointment;
  onCancelClick?: (appointmentId: string) => void;
}

export default function AppointmentCard({ appointment, onCancelClick }: AppointmentCardProps) {
  const router = useRouter();
  
  // Format date and time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
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

  // Get status color
  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isUpcoming = () => {
    const now = new Date();
    const appointmentDate = new Date(appointment.startTime);
    return appointmentDate > now && appointment.status !== 'cancelled';
  };

  const handleClick = () => {
    router.push(`/appointments/${appointment.appointmentId}`);
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCancelClick) {
      onCancelClick(appointment.appointmentId);
    }
  };

  return (
    <motion.div
      className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 cursor-pointer hover:border-primary-100"
      whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
      transition={{ duration: 0.3 }}
      onClick={handleClick}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {appointment.appointmentType}
            </h3>
            <p className="text-gray-600">
              with Dr. {appointment.doctorDetails?.lastName || appointment.doctorName || 'Unknown'}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center text-gray-600 text-sm mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(appointment.startTime)}
          </div>
          
          <div className="flex items-center text-gray-600 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
          </div>
        </div>
        
        {appointment.notes && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
            <p className="line-clamp-2">{appointment.notes}</p>
          </div>
        )}
        
        {isUpcoming() && onCancelClick && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              onClick={handleCancelClick}
            >
              Cancel Appointment
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
} 