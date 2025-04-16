import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSchedules } from '../../hooks/useSchedules';
import { useAuthStore } from '../../store/authStore';

interface ScheduleFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export default function ScheduleForm({ onCancel, onSuccess }: ScheduleFormProps) {
  const { user } = useAuthStore();
  const { createSchedule, loading, error: apiError } = useSchedules();
  
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Default to Monday
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!user || !user.userId) {
      setError('User information not available');
      return;
    }
    
    // Validate times
    if (!validateTimes()) {
      return;
    }
    
    try {
      const scheduleData = {
        doctorId: user.userId,
        dayOfWeek,
        startTime,
        endTime,
        slotDuration
      };
      
      console.log('Creating schedule with data:', scheduleData);
      console.log('API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1');
      
      const result = await createSchedule(scheduleData);
      
      console.log('Schedule creation result:', result);
      
      if (result) {
        onSuccess();
      } else {
        setError('Failed to create schedule');
      }
    } catch (err: any) {
      console.error('Error creating schedule:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      
      // Check if it's a conflict error (schedule already exists for this day)
      if (err.status === 409) {
        setError('A schedule already exists for this day. Please edit the existing schedule instead.');
      } else {
        setError('An error occurred while creating the schedule');
      }
    }
  };
  
  const validateTimes = (): boolean => {
    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      setError('Times must be in format HH:MM');
      return false;
    }
    
    // Validate start time is before end time
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    if (startMinutes >= endMinutes) {
      setError('End time must be after start time');
      return false;
    }
    
    // Validate slot duration
    if (slotDuration <= 0) {
      setError('Slot duration must be positive');
      return false;
    }
    
    return true;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-sm p-6 mb-6"
    >
      <h2 className="text-xl font-bold text-gray-800 mb-6">Add New Schedule</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="dayOfWeek">
              Day of Week
            </label>
            <select
              id="dayOfWeek"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              required
            >
              {dayNames.map((day, index) => (
                <option key={index} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="slotDuration">
              Appointment Slot Duration (minutes)
            </label>
            <input
              type="number"
              id="slotDuration"
              value={slotDuration}
              onChange={(e) => setSlotDuration(Number(e.target.value))}
              min="5"
              max="120"
              step="5"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              How long each appointment slot will be (in minutes)
            </p>
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="startTime">
              Start Time
            </label>
            <input
              type="text"
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="HH:MM (24-hour format)"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Format: HH:MM (24-hour), e.g., 09:00
            </p>
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="endTime">
              End Time
            </label>
            <input
              type="text"
              id="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="HH:MM (24-hour format)"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Format: HH:MM (24-hour), e.g., 17:00
            </p>
          </div>
        </div>
        
        {(error || apiError) && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error || apiError}
          </div>
        )}
        
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg text-sm font-medium transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              'Create Schedule'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
} 