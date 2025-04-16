import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSchedules } from '../../hooks/useSchedules';
import { ISchedule } from '../../types/schedule';

interface ScheduleItemProps {
  schedule: ISchedule;
  dayNames: string[];
  isEditing: boolean;
  isConfirmingDelete: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onCancelEdit: () => void;
  onUpdateSuccess: (updatedSchedule: ISchedule) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export default function ScheduleItem({
  schedule,
  dayNames,
  isEditing,
  isConfirmingDelete,
  onEditClick,
  onDeleteClick,
  onCancelEdit,
  onUpdateSuccess,
  onConfirmDelete,
  onCancelDelete
}: ScheduleItemProps) {
  const { updateSchedule } = useSchedules();
  const [startTime, setStartTime] = useState(schedule.startTime);
  const [endTime, setEndTime] = useState(schedule.endTime);
  const [slotDuration, setSlotDuration] = useState(schedule.slotDuration);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Reset form when editing status changes
    if (isEditing) {
      setStartTime(schedule.startTime);
      setEndTime(schedule.endTime);
      setSlotDuration(schedule.slotDuration);
      setError(null);
    }
  }, [isEditing, schedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate times
    if (!validateTimes()) {
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const updatedData = {
        startTime,
        endTime,
        slotDuration: Number(slotDuration)
      };
      
      const result = await updateSchedule(schedule.scheduleId, updatedData);
      
      if (result) {
        onUpdateSuccess(result);
      } else {
        setError('Failed to update schedule');
      }
    } catch (err) {
      console.error('Error updating schedule:', err);
      setError('An error occurred while updating schedule');
    } finally {
      setIsUpdating(false);
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
    if (Number(slotDuration) <= 0) {
      setError('Slot duration must be positive');
      return false;
    }
    
    return true;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      {isConfirmingDelete ? (
        <div className="p-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Are you sure you want to delete this schedule?
          </h3>
          <div className="flex justify-end space-x-3">
            <button
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              onClick={onCancelDelete}
            >
              Cancel
            </button>
            <button
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              onClick={onConfirmDelete}
            >
              Delete
            </button>
          </div>
        </div>
      ) : isEditing ? (
        <form onSubmit={handleSubmit} className="p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">Day</label>
              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                {dayNames[schedule.dayOfWeek]}
              </div>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="startTime">
                Start Time
              </label>
              <input
                type="text"
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="HH:MM"
                className="w-full p-2 border border-gray-200 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="endTime">
                End Time
              </label>
              <input
                type="text"
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="HH:MM"
                className="w-full p-2 border border-gray-200 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="slotDuration">
                Slot Duration (minutes)
              </label>
              <input
                type="number"
                id="slotDuration"
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                min="1"
                className="w-full p-2 border border-gray-200 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
          </div>
          
          {error && (
            <div className="text-red-500 text-sm mb-4">
              {error}
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              onClick={onCancelEdit}
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-800">
              {dayNames[schedule.dayOfWeek]}
            </h3>
          </div>
          <div className="text-gray-600">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {schedule.startTime} - {schedule.endTime}
            </div>
          </div>
          <div className="text-gray-600">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
              </svg>
              {schedule.slotDuration} min slots
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              className="p-2 text-gray-500 hover:text-primary-600 transition-colors"
              onClick={onEditClick}
              aria-label="Edit schedule"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button
              className="p-2 text-gray-500 hover:text-red-600 transition-colors"
              onClick={onDeleteClick}
              aria-label="Delete schedule"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 