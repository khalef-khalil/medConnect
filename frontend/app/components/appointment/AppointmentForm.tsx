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
      // Set date range for next 4 weeks (instead of 2)
      const today = new Date();
      const fourWeeksLater = new Date();
      fourWeeksLater.setDate(today.getDate() + 28);
      
      const formattedStartDate = today.toISOString().split('T')[0];
      const formattedEndDate = fourWeeksLater.toISOString().split('T')[0];
      
      setStartDate(formattedStartDate);
      setEndDate(formattedEndDate);
      
      fetchDoctorAvailability(doctorId, formattedStartDate, formattedEndDate);
    }
  }, [doctorId, fetchDoctorAvailability]);
  
  const getDaysWithSlots = (): DailyAvailability[] => {
    if (!availability || !availability.availableSlots) return [];
    
    // Process the available slots into daily slots
    const slotsByDay: { [date: string]: AvailabilitySlot[] } = {};
    
    // Group slots by day
    if (Array.isArray(availability.availableSlots)) {
      // Already in the correct format
      return availability.availableSlots.filter(day => day && day.date); // Filter out items with undefined date
    } else {
      // Handle case when availableSlots might have a different structure
      // Create an empty array for backwards compatibility
      return [];
    }
  };
  
  const getSlotsForDay = (date: string): AvailabilitySlot[] => {
    if (!date) return [];
    const day = getDaysWithSlots().find(day => day && day.date === date);
    return day && day.slots ? day.slots : [];
  };
  
  const formatTimeSlot = (slot: AvailabilitySlot): string => {
    try {
      const startTime = new Date(slot.startTime);
      const endTime = new Date(slot.endTime);
      
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return "Invalid time slot";
      }
      
      return `${startTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })} - ${endTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}`;
    } catch (error) {
      console.error("Error formatting time slot:", error);
      return "Invalid time slot";
    }
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
  
  // Group available days by week for better display
  const getWeeksWithAvailability = () => {
    const daysWithSlots = getDaysWithSlots();
    if (!daysWithSlots.length) return [];
    
    // Group days into weeks
    const weeks: DailyAvailability[][] = [];
    let currentWeek: DailyAvailability[] = [];
    
    daysWithSlots
      .filter(day => day && day.date && day.slots && day.slots.length > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(day => {
        const date = new Date(day.date);
        
        // If it's the first day or a Sunday (0), start a new week
        if (currentWeek.length === 0 || date.getDay() === 0) {
          if (currentWeek.length > 0) {
            weeks.push(currentWeek);
          }
          currentWeek = [day];
        } else {
          currentWeek.push(day);
        }
      });
    
    // Add the last week if it has days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm p-6 md:p-8"
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Schedule an Appointment</h2>
        <p className="text-gray-600">
          with Dr. {doctor.firstName} {doctor.lastName} ({doctor.specialization})
        </p>
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
          <label className="block text-gray-700 font-medium mb-2">Available Dates</label>
          {loading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-gray-600">Loading available dates...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {getWeeksWithAvailability().length > 0 ? (
                getWeeksWithAvailability().map((week, weekIndex) => (
                  <div key={`week-${weekIndex}`} className="mb-6">
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      Week {weekIndex + 1}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                      {week.map((day) => {
                        try {
                          if (!day || !day.date) return null;
                          
                          const date = new Date(day.date);
                          const isSelected = selectedDate === day.date;
                          
                          if (isNaN(date.getTime())) {
                            return null;
                          }
                          
                          return (
                            <motion.button
                              key={day.date}
                              type="button"
                              className={`p-3 rounded-lg text-center transition-colors ${
                                isSelected
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                              } flex flex-col items-center`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setSelectedDate(day.date);
                                setSelectedTimeSlot(null);
                              }}
                            >
                              <div className="text-xs font-medium mb-1">
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                              <div className="font-medium">
                                {date.getDate()}
                              </div>
                              <div className="text-xs">
                                {date.toLocaleDateString('en-US', { month: 'short' })}
                              </div>
                              <div className="text-xs mt-1 text-primary-500">
                                {day.slots.length} slots
                              </div>
                            </motion.button>
                          );
                        } catch (error) {
                          console.error("Error rendering date:", error);
                          return null;
                        }
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
                  <div className="font-medium mb-1">No available appointments</div>
                  <p className="text-sm">
                    Dr. {doctor.lastName} hasn't set up their schedule yet for the next 4 weeks. 
                    Please check back later or select another doctor.
                  </p>
                  <button
                    type="button"
                    className="mt-3 text-sm bg-white py-1 px-3 rounded border border-yellow-300 hover:bg-yellow-50 transition-colors"
                    onClick={() => router.push('/doctors')}
                  >
                    Find Another Doctor
                  </button>
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
            <div className="flex justify-between items-center mb-2">
              <label className="block text-gray-700 font-medium">
                Available Time Slots for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </label>
              {selectedTimeSlot && (
                <span className="text-sm text-primary-600 font-medium">
                  Selected: {formatTimeSlot(selectedTimeSlot)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {getSlotsForDay(selectedDate).length > 0 ? (
                getSlotsForDay(selectedDate)
                  .filter(slot => slot && slot.startTime && slot.endTime)
                  .map((slot, index) => {
                    try {
                      const startTime = new Date(slot.startTime);
                      const endTime = new Date(slot.endTime);
                      
                      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                        return null;
                      }
                      
                      const isSelected = selectedTimeSlot && 
                        selectedTimeSlot.startTime === slot.startTime && 
                        selectedTimeSlot.endTime === slot.endTime;
                      
                      // Group by morning, afternoon, evening
                      const hour = startTime.getHours();
                      let timeGroup = '';
                      if (hour < 12) timeGroup = 'Morning';
                      else if (hour < 17) timeGroup = 'Afternoon';
                      else timeGroup = 'Evening';
                      
                      return (
                        <motion.button
                          key={`${slot.startTime}-${index}`}
                          type="button"
                          className={`p-3 rounded-lg text-center transition-colors ${
                            isSelected
                              ? 'bg-primary-600 text-white border-2 border-primary-700'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedTimeSlot(slot)}
                        >
                          <div className="text-xs mb-1 font-medium opacity-75">{timeGroup}</div>
                          {formatTimeSlot(slot)}
                        </motion.button>
                      );
                    } catch (error) {
                      console.error("Error rendering time slot:", error);
                      return null;
                    }
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
                <span>Booking...</span>
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