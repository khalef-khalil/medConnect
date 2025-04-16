import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppointmentCard from './AppointmentCard';
import { useAppointments } from '../../hooks/useAppointments';
import { useAuthStore } from '../../store/authStore';
import { Appointment } from '../../types/appointment';

export default function AppointmentList() {
  const { appointments, loading, error, fetchAppointments, removeAppointment } = useAppointments();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    const now = new Date();
    
    if (appointments && appointments.length > 0) {
      if (activeTab === 'upcoming') {
        const upcoming = appointments.filter(
          (appointment) => 
            new Date(appointment.startTime) > now && 
            appointment.status !== 'cancelled'
        );
        setFilteredAppointments(upcoming);
      } else {
        const past = appointments.filter(
          (appointment) => 
            new Date(appointment.startTime) < now || 
            appointment.status === 'cancelled'
        );
        setFilteredAppointments(past);
      }
    } else {
      setFilteredAppointments([]);
    }
  }, [appointments, activeTab]);

  const handleCancelAppointment = async (appointmentId: string) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      const success = await removeAppointment(appointmentId);
      if (success) {
        fetchAppointments();
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  if (loading && !appointments.length) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && !appointments.length) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">Failed to load appointments</p>
        <button 
          className="bg-primary-600 text-white px-4 py-2 rounded-lg"
          onClick={() => fetchAppointments()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'upcoming'
              ? 'text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming Appointments
          {activeTab === 'upcoming' && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
              layoutId="appointmentTabIndicator"
            />
          )}
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'past'
              ? 'text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('past')}
        >
          Past Appointments
          {activeTab === 'past' && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
              layoutId="appointmentTabIndicator"
            />
          )}
        </button>
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={activeTab}
      >
        <AnimatePresence>
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((appointment) => (
              <motion.div key={appointment.appointmentId} variants={itemVariants} layout>
                <AppointmentCard 
                  appointment={appointment} 
                  onCancelClick={activeTab === 'upcoming' ? handleCancelAppointment : undefined}
                />
              </motion.div>
            ))
          ) : (
            <motion.div 
              className="col-span-full text-center py-12"
              variants={itemVariants}
            >
              <p className="text-gray-500">
                {activeTab === 'upcoming' 
                  ? "You don't have any upcoming appointments" 
                  : "You don't have any past appointments"}
              </p>
              {activeTab === 'upcoming' && user?.role === 'patient' && (
                <button
                  className="mt-4 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                  onClick={() => {
                    window.location.href = '/doctors';
                  }}
                >
                  Find a Doctor
                </button>
              )}
              {activeTab === 'upcoming' && user?.role === 'doctor' && (
                <p className="mt-2 text-sm text-gray-500">
                  Patients will book appointments based on your schedule availability.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
} 