import axios from 'axios';
import { Doctor } from '../../types/appointment';
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

// Get all doctors
export const getAllDoctors = async (token: string): Promise<Doctor[]> => {
  const api = createAxiosInstance(token);
  const response = await api.get('/users/doctors');
  return response.data.users;
};

// Get doctor by ID
export const getDoctorById = async (token: string, doctorId: string): Promise<Doctor> => {
  const api = createAxiosInstance(token);
  const response = await api.get(`/users/doctors/${doctorId}`);
  return response.data.user;
};

// Get doctors by specialization
export const getDoctorsBySpecialization = async (token: string, specialization: string): Promise<Doctor[]> => {
  const api = createAxiosInstance(token);
  const response = await api.get(`/users/doctors?specialization=${specialization}`);
  return response.data.users;
}; 