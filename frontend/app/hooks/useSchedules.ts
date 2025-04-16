'use client';

import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  ISchedule, 
  IScheduleCreateRequest,
  IScheduleUpdateRequest, 
  IScheduleResponse,
  IScheduleError
} from '../types/schedule';

export const useSchedules = () => {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  const fetchDoctorSchedules = async (doctorId: string): Promise<IScheduleResponse | null> => {
    if (!token) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/schedules/doctor/${doctorId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { 
            schedules: [], 
            count: 0,
            doctorDetails: null 
          };
        }
        
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch schedules' }));
        throw { 
          status: response.status, 
          message: errorData.message || 'Failed to fetch schedules' 
        };
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching doctor schedules:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while fetching schedules');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async (scheduleData: IScheduleCreateRequest): Promise<ISchedule | null> => {
    if (!token) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/schedules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw { 
          status: response.status, 
          message: errorData.message || 'Failed to create schedule' 
        } as IScheduleError;
      }

      const data = await response.json();
      return data.schedule;
    } catch (err) {
      console.error('Error creating schedule:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while creating schedule');
      }
      // Rethrow to allow component to handle specific errors (like conflicts)
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = async (scheduleId: string, updateData: IScheduleUpdateRequest): Promise<ISchedule | null> => {
    if (!token) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw { 
          status: response.status, 
          message: errorData.message || 'Failed to update schedule' 
        };
      }

      const data = await response.json();
      return data.schedule;
    } catch (err) {
      console.error('Error updating schedule:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while updating schedule');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async (scheduleId: string): Promise<boolean> => {
    if (!token) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw { 
          status: response.status, 
          message: errorData.message || 'Failed to delete schedule' 
        };
      }

      return true;
    } catch (err) {
      console.error('Error deleting schedule:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while deleting schedule');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchDoctorSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    loading,
    error
  };
}; 