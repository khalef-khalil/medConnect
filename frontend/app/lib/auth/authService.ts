import axios from 'axios';
import { 
  AuthResponse, 
  LoginFormData, 
  RegisterFormData, 
  ForgotPasswordFormData,
  UpdateProfileFormData,
  User
} from '../../types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const authApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Immediately set token if one exists in storage
if (typeof window !== 'undefined') {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsedData = JSON.parse(authData);
      const token = parsedData.state?.token;
      
      if (token) {
        authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (error) {
    console.error('Error setting token from storage on init', error);
  }
}

// Add interceptor to add token to requests
authApi.interceptors.request.use(
  (config) => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      try {
        const storedAuthString = localStorage.getItem('auth-storage');
        
        if (storedAuthString) {
          const storedAuth = JSON.parse(storedAuthString);
          const token = storedAuth.state?.token;
          
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (error) {
        console.error('Error parsing auth token from storage', error);
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle common errors
authApi.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export const authService = {
  register: async (userData: RegisterFormData): Promise<AuthResponse> => {
    const response = await authApi.post<AuthResponse>('/users/register', userData);
    return response.data;
  },
  
  login: async (credentials: LoginFormData): Promise<AuthResponse> => {
    const response = await authApi.post<AuthResponse>('/users/login', credentials);
    return response.data;
  },
  
  forgotPassword: async (data: ForgotPasswordFormData): Promise<{ message: string }> => {
    const response = await authApi.post<{ message: string }>('/users/forgot-password', data);
    return response.data;
  },
  
  getProfile: async (): Promise<User> => {
    const response = await authApi.get<User>('/users/profile');
    return response.data;
  },
  
  updateProfile: async (data: UpdateProfileFormData): Promise<User> => {
    const response = await authApi.put<User>('/users/profile', data);
    return response.data;
  },
  
  // Helper method to set auth token in headers
  setAuthToken: (token: string) => {
    authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },
  
  // Helper method to remove auth token from headers
  clearAuthToken: () => {
    delete authApi.defaults.headers.common['Authorization'];
  }
}; 