import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAppointments } from '../../hooks/useAppointments';
import { useDoctors } from '../../hooks/useDoctors';
import { useAuthStore } from '../../store/authStore';
import { AvailabilitySlot, DailyAvailability } from '../../types/appointment';

const APPOINTMENT_TYPES = [
  'Consultation',
  'Follow-up',
  'Examination',
  'Emergency',
  'Therapy',
  'Vaccination'
];

export default function AppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { createNewAppointment, fetchDoctorAvailability, availability, loading } = useAppointments();
  const { doctor, fetchDoctorById } = useDoctors();
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<AvailabilitySlot | null>(null);
  const [appointmentType, setAppointmentType] = useState<string>(APPOINTMENT_TYPES[0]);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date range for availability checking
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Get doctorId from query params if available
  const doctorId = searchParams.get('doctorId');
  
  useEffect(() => {
    if (doctorId) {
      fetchDoctorById(doctorId);
    }
  }, [doctorId, fetchDoctorById]);
  
  useEffect(() => {
    if (doctorId) {
      // Set date range for next 2 weeks
      const today = new Date();
      const twoWeeksLater = new Date();
      twoWeeksLater.setDate(today.getDate() + 14);
      
      const formattedStartDate = today.toISOString().split('T')[0];
      const formattedEndDate = twoWeeksLater.toISOString().split('T')[0];
      
      setStartDate(formattedStartDate);
      setEndDate(formattedEndDate);
      
      fetchDoctorAvailability(doctorId, formattedStartDate, formattedEndDate);
    }
  }, [doctorId, fetchDoctorAvailability]);
  
  const getDaysWithSlots = (): DailyAvailability[] => {
    if (!availability || !availability.availableSlots) return [];
    return availability.availableSlots;
  };
  
  const getSlotsForDay = (date: string): AvailabilitySlot[] => {
    const day = getDaysWithSlots().find(day => day.date === date);
    return day ? day.slots : [];
  };
  
  const formatTimeSlot = (slot: AvailabilitySlot): string => {
    const startTime = new Date(slot.startTime);
    const endTime = new Date(slot.endTime);
    
    return `${startTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })} - ${endTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}`;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !doctor || !selectedTimeSlot) {
      setError('Please select a doctor, date, and time slot');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const appointmentData = {
        patientId: user.userId,
        doctorId: doctor.userId,
        startTime: selectedTimeSlot.startTime,
        endTime: selectedTimeSlot.endTime,
        appointmentType,
        notes
      };
      
      const result = await createNewAppointment(appointmentData);
      
      if (result) {
        router.push('/appointments');
      } else {
        setError('Failed to book appointment. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!doctor) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Please select a doctor to schedule an appointment with</p>
        <button
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          onClick={() => router.push('/doctors')}
        >
          Find a Doctor
        </button>
      </div>
    );
  }
  
  return (
    <motion.div
      className="bg-white rounded-xl shadow-sm p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Book an Appointment</h2>
      
      <div className="mb-6">
        <h3 className="text-gray-700 font-medium mb-2">Selected Doctor</h3>
        <div className="bg-gray-50 p-4 rounded-lg flex items-center">
          <div className="text-primary-600 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">Dr. {doctor.firstName} {doctor.lastName}</p>
            <p className="text-sm text-gray-600">{doctor.specialization}</p>
          </div>
          <button
            className="ml-auto text-primary-600 text-sm"
            onClick={() => router.push('/doctors')}
          >
            Change
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">Appointment Type</label>
          <select
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            value={appointmentType}
            onChange={(e) => setAppointmentType(e.target.value)}
            required
          >
            {APPOINTMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">Select Date</label>
          {loading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-gray-600">Loading available dates...</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {getDaysWithSlots().length > 0 ? (
                getDaysWithSlots().map((day) => {
                  const date = new Date(day.date);
                  const isSelected = selectedDate === day.date;
                  
                  return (
                    <motion.button
                      key={day.date}
                      type="button"
                      className={`p-3 rounded-lg text-center transition-colors ${
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedDate(day.date);
                        setSelectedTimeSlot(null);
                      }}
                    >
                      <div className="text-xs mb-1">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="font-medium">
                        {date.getDate()}
                      </div>
                      <div className="text-xs">
                        {date.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </motion.button>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-4 text-gray-500">
                  No available dates found for the next two weeks.
                </div>
              )}
            </div>
          )}
        </div>
        
        {selectedDate && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <label className="block text-gray-700 font-medium mb-2">Select Time</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {getSlotsForDay(selectedDate).length > 0 ? (
                getSlotsForDay(selectedDate).map((slot, index) => {
                  const isSelected = selectedTimeSlot && 
                    selectedTimeSlot.startTime === slot.startTime && 
                    selectedTimeSlot.endTime === slot.endTime;
                  
                  return (
                    <motion.button
                      key={index}
                      type="button"
                      className={`p-3 rounded-lg text-center transition-colors ${
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedTimeSlot(slot)}
                    >
                      {formatTimeSlot(slot)}
                    </motion.button>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-4 text-gray-500">
                  No available time slots for this date.
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">Notes (Optional)</label>
          <textarea
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500 h-32"
            placeholder="Add any notes or details about your appointment..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          ></textarea>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="flex justify-end">
          <button
            type="button"
            className="mr-4 px-6 py-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => router.back()}
          >
            Cancel
          </button>
          <motion.button
            type="submit"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg disabled:opacity-70 hover:bg-primary-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!selectedTimeSlot || submitting}
          >
            {submitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Booking...
              </div>
            ) : (
              'Book Appointment'
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
} 