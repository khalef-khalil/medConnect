import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../lib/auth/authService';
import { useAuthStore } from '../store/authStore';
import { LoginFormData, RegisterFormData, ForgotPasswordFormData, UpdateProfileFormData } from '../types/auth';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setAuth, clearAuth, updateUser } = useAuthStore();

  const register = async (data: RegisterFormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.register(data);
      setAuth(response.token, response.user);
      authService.setAuthToken(response.token);
      router.push('/dashboard');
      return response;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong during registration');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(data);
      setAuth(response.token, response.user);
      authService.setAuthToken(response.token);
      router.push('/dashboard');
      return response;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuth();
    authService.clearAuthToken();
    router.push('/auth/login');
  };

  const forgotPassword = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.forgotPassword(data);
      return response;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error sending password reset email');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const userData = await authService.getProfile();
      updateUser(userData);
      return userData;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error fetching user profile');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: UpdateProfileFormData) => {
    setLoading(true);
    setError(null);
    try {
      const updatedUser = await authService.updateProfile(data);
      updateUser(updatedUser);
      return updatedUser;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating profile');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    register,
    login,
    logout,
    forgotPassword,
    getProfile,
    updateProfile,
    loading,
    error
  };
}; 