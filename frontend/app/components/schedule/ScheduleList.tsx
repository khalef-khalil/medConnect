import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSchedules } from '../../hooks/useSchedules';
import ScheduleItem from './ScheduleItem';
import { ISchedule } from '../../types/schedule';

interface ScheduleListProps {
  doctorId: string;
}

export default function ScheduleList({ doctorId }: ScheduleListProps) {
  const { fetchDoctorSchedules, deleteSchedule, loading, error } = useSchedules();
  const [schedules, setSchedules] = useState<ISchedule[]>([]);
  const [sortedSchedules, setSortedSchedules] = useState<ISchedule[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<{status: number, message: string} | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  useEffect(() => {
    if (doctorId && !hasFetchedOnce) {
      loadSchedules();
      setHasFetchedOnce(true);
    }
  }, [doctorId, hasFetchedOnce]);

  const loadSchedules = async () => {
    try {
      const result = await fetchDoctorSchedules(doctorId);
      if (result && result.schedules) {
        setSchedules(result.schedules);
      }
      setFetchError(null);
    } catch (err: any) {
      console.error('Error loading schedules:', err);
      
      // If it's a 404, that just means no schedules yet (not a real error)
      if (err.status === 404) {
        setSchedules([]);
        setFetchError(null);
      } else {
        setFetchError(err);
      }
    }
  };

  useEffect(() => {
    if (schedules && schedules.length > 0) {
      // Sort schedules by day of week
      const sorted = [...schedules].sort((a, b) => {
        return a.dayOfWeek - b.dayOfWeek;
      });
      setSortedSchedules(sorted);
    } else {
      setSortedSchedules([]);
    }
  }, [schedules]);

  const handleEditClick = (scheduleId: string) => {
    setIsEditing(scheduleId);
    setConfirmDelete(null);
  };

  const handleDeleteClick = (scheduleId: string) => {
    setConfirmDelete(scheduleId);
    setIsEditing(null);
  };

  const confirmDeleteSchedule = async (scheduleId: string) => {
    try {
      await deleteSchedule(scheduleId);
      setSchedules(prevSchedules => 
        prevSchedules.filter(schedule => schedule.scheduleId !== scheduleId)
      );
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting schedule:', err);
    }
  };

  const cancelEdit = () => {
    setIsEditing(null);
  };

  const handleUpdateSuccess = (updatedSchedule: ISchedule) => {
    setSchedules(prevSchedules => 
      prevSchedules.map(schedule => 
        schedule.scheduleId === updatedSchedule.scheduleId ? updatedSchedule : schedule
      )
    );
    setIsEditing(null);
  };

  if (loading && !hasFetchedOnce) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading schedules...</span>
      </div>
    );
  }

  if (fetchError && fetchError.status !== 404) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          {fetchError.message || 'Error loading schedules'}
        </div>
        <button 
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          onClick={() => {
            setHasFetchedOnce(false);
            loadSchedules();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (sortedSchedules.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">You don't have any schedules set up yet.</p>
        <p className="text-gray-500">Use the "Add Schedule" button to create your availability.</p>
      </div>
    );
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {sortedSchedules.map(schedule => (
            <motion.div
              key={schedule.scheduleId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              transition={{ duration: 0.3 }}
            >
              <ScheduleItem
                schedule={schedule}
                dayNames={dayNames}
                isEditing={isEditing === schedule.scheduleId}
                isConfirmingDelete={confirmDelete === schedule.scheduleId}
                onEditClick={() => handleEditClick(schedule.scheduleId)}
                onDeleteClick={() => handleDeleteClick(schedule.scheduleId)}
                onCancelEdit={cancelEdit}
                onUpdateSuccess={handleUpdateSuccess}
                onConfirmDelete={() => confirmDeleteSchedule(schedule.scheduleId)}
                onCancelDelete={() => setConfirmDelete(null)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
} 