import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppointmentCard from './AppointmentCard';
import { useAppointments } from '../../hooks/useAppointments';
import { useAuthStore } from '../../store/authStore';
import { Appointment } from '../../types/appointment';

export default function AppointmentList() {
  const { appointments, loading, error, fetchAppointments, removeAppointment, fetchAppointmentById } = useAppointments();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [enrichedAppointments, setEnrichedAppointments] = useState<Appointment[]>([]);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Function to fetch detailed information for appointments
  const fetchDetailedAppointments = async (appointmentsToFetch: Appointment[]) => {
    if (!user || user.role !== 'doctor' || appointmentsToFetch.length === 0) {
      return appointmentsToFetch;
    }

    setDetailsLoading(true);
    const detailedAppointments = [...appointmentsToFetch];
    
    for (let i = 0; i < detailedAppointments.length; i++) {
      try {
        const details = await fetchAppointmentById(detailedAppointments[i].appointmentId);
        if (details) {
          detailedAppointments[i] = details;
        }
      } catch (error) {
        console.error(`Failed to fetch details for appointment ${detailedAppointments[i].appointmentId}`, error);
      }
    }
    
    setDetailsLoading(false);
    return detailedAppointments;
  };

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
        
        // If user is a doctor, fetch detailed patient info for each appointment
        if (user?.role === 'doctor') {
          fetchDetailedAppointments(upcoming).then(setEnrichedAppointments);
        } else {
          setEnrichedAppointments(upcoming);
        }
      } else {
        const past = appointments.filter(
          (appointment) => 
            new Date(appointment.startTime) < now || 
            appointment.status === 'cancelled'
        );
        setFilteredAppointments(past);
        
        // If user is a doctor, fetch detailed patient info for each appointment
        if (user?.role === 'doctor') {
          fetchDetailedAppointments(past).then(setEnrichedAppointments);
        } else {
          setEnrichedAppointments(past);
        }
      }
    } else {
      setFilteredAppointments([]);
      setEnrichedAppointments([]);
    }
  }, [appointments, activeTab, user, fetchAppointmentById]);

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

  const displayAppointments = enrichedAppointments.length > 0 ? enrichedAppointments : filteredAppointments;

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

      {detailsLoading && user?.role === 'doctor' && (
        <div className="text-center py-2 mb-4">
          <div className="inline-block animate-pulse text-sm text-gray-500">
            Loading patient details...
          </div>
        </div>
      )}

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={activeTab}
      >
        <AnimatePresence>
          {displayAppointments.length > 0 ? (
            displayAppointments.map((appointment) => (
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