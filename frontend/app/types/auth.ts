export type UserRole = "patient" | "doctor" | "admin";

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  profileImage?: string;
  specialization?: string; // For doctors
}

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
  token: string;
}

export interface UpdateProfileFormData {
  firstName: string;
  lastName: string;
  profileImage?: string;
  specialization?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
} 