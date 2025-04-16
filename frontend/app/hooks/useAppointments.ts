import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { 
  getAllAppointments, 
  getAppointmentById, 
  createAppointment, 
  updateAppointment, 
  deleteAppointment,
  getDoctorAvailability,
  getDoctorAppointments
} from '../lib/api/appointmentApi';
import { 
  Appointment, 
  CreateAppointmentPayload, 
  UpdateAppointmentPayload, 
  DoctorAvailability 
} from '../types/appointment';

export function useAppointments() {
  const { token } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<DoctorAvailability | null>(null);

  // Fetch all appointments
  const fetchAppointments = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAllAppointments(token);
      setAppointments(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch appointments');
      toast.error(err.response?.data?.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch appointment by ID
  const fetchAppointmentById = useCallback(async (appointmentId: string) => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAppointmentById(token, appointmentId);
      setAppointment(data);
      return data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch appointment details');
      toast.error(err.response?.data?.message || 'Failed to fetch appointment details');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Create new appointment
  const createNewAppointment = useCallback(async (appointmentData: CreateAppointmentPayload) => {
    if (!token) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await createAppointment(token, appointmentData);
      toast.success('Appointment created successfully');
      return data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create appointment');
      toast.error(err.response?.data?.message || 'Failed to create appointment');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Update appointment
  const updateExistingAppointment = useCallback(async (appointmentId: string, updateData: UpdateAppointmentPayload) => {
    if (!token) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await updateAppointment(token, appointmentId, updateData);
      toast.success('Appointment updated successfully');
      return data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update appointment');
      toast.error(err.response?.data?.message || 'Failed to update appointment');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Delete appointment
  const removeAppointment = useCallback(async (appointmentId: string) => {
    if (!token) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      await deleteAppointment(token, appointmentId);
      toast.success('Appointment cancelled successfully');
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel appointment');
      toast.error(err.response?.data?.message || 'Failed to cancel appointment');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Get doctor availability
  const fetchDoctorAvailability = useCallback(async (doctorId: string, startDate: string, endDate: string) => {
    if (!token) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getDoctorAvailability(token, doctorId, startDate, endDate);
      setAvailability(data);
      return data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch doctor availability');
      toast.error(err.response?.data?.message || 'Failed to fetch doctor availability');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch doctor's appointments by date range
  const fetchDoctorAppointments = useCallback(async (doctorId: string, startDate?: string, endDate?: string) => {
    if (!token) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getDoctorAppointments(token, doctorId, startDate, endDate);
      return data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch doctor appointments');
      console.error('Error fetching doctor appointments:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    appointments,
    appointment,
    loading,
    error,
    availability,
    fetchAppointments,
    fetchAppointmentById,
    createNewAppointment,
    updateExistingAppointment,
    removeAppointment,
    fetchDoctorAvailability,
    fetchDoctorAppointments
  };
} 