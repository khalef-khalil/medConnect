import axios from 'axios';
import { 
  Appointment, 
  CreateAppointmentPayload, 
  DoctorAvailability, 
  UpdateAppointmentPayload 
} from '../../types/appointment';
import { getApiUrl } from '../networkUtils';

// Get the API URL dynamically
const API_URL = getApiUrl();

// Create axios instance with authorization header
const createAxiosInstance = (token: string) => {
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

// Get all appointments
export const getAllAppointments = async (token: string): Promise<Appointment[]> => {
  const api = createAxiosInstance(token);
  const response = await api.get('/appointments');
  return response.data.appointments;
};

// Get appointment by ID
export const getAppointmentById = async (token: string, appointmentId: string): Promise<Appointment> => {
  const api = createAxiosInstance(token);
  const response = await api.get(`/appointments/${appointmentId}`);
  return response.data;
};

// Create appointment
export const createAppointment = async (token: string, appointmentData: CreateAppointmentPayload): Promise<Appointment> => {
  const api = createAxiosInstance(token);
  const response = await api.post('/appointments', appointmentData);
  return response.data.appointment;
};

// Update appointment
export const updateAppointment = async (token: string, appointmentId: string, updateData: UpdateAppointmentPayload): Promise<Appointment> => {
  const api = createAxiosInstance(token);
  const response = await api.put(`/appointments/${appointmentId}`, updateData);
  return response.data;
};

// Delete appointment
export const deleteAppointment = async (token: string, appointmentId: string): Promise<{ message: string }> => {
  const api = createAxiosInstance(token);
  const response = await api.delete(`/appointments/${appointmentId}`);
  return response.data;
};

// Get doctor availability
export const getDoctorAvailability = async (
  token: string, 
  doctorId: string, 
  startDate: string, 
  endDate: string
): Promise<DoctorAvailability> => {
  const api = createAxiosInstance(token);
  const response = await api.get(`/appointments/doctor/${doctorId}/availability?startDate=${startDate}&endDate=${endDate}`);
  return response.data;
};

// Get doctor appointments by date range
export const getDoctorAppointments = async (
  token: string,
  doctorId: string,
  startDate?: string,
  endDate?: string
): Promise<{ appointments: Appointment[] }> => {
  const api = createAxiosInstance(token);
  let url = `/appointments?doctorId=${doctorId}`;
  
  if (startDate) {
    url += `&startDate=${startDate}`;
  }
  
  if (endDate) {
    url += `&endDate=${endDate}`;
  }
  
  const response = await api.get(url);
  return response.data;
}; 