import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { Doctor } from '../types/appointment';
import { getAllDoctors, getDoctorById, getDoctorsBySpecialization } from '../lib/api/doctorApi';

export function useDoctors() {
  const { token } = useAuthStore();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all doctors
  const fetchDoctors = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAllDoctors(token);
      setDoctors(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch doctors');
      toast.error(err.response?.data?.message || 'Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch doctor by ID
  const fetchDoctorById = useCallback(async (doctorId: string) => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getDoctorById(token, doctorId);
      setDoctor(data);
      return data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch doctor details');
      toast.error(err.response?.data?.message || 'Failed to fetch doctor details');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch doctors by specialization
  const fetchDoctorsBySpecialization = useCallback(async (specialization: string) => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getDoctorsBySpecialization(token, specialization);
      setDoctors(data);
      return data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch doctors by specialization');
      toast.error(err.response?.data?.message || 'Failed to fetch doctors by specialization');
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    doctors,
    doctor,
    loading,
    error,
    fetchDoctors,
    fetchDoctorById,
    fetchDoctorsBySpecialization
  };
} 