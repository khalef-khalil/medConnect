'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterFormData, UserRole } from '@/app/types/auth';
import { registerSchema } from '@/app/lib/auth/validation';
import { useAuth } from '@/app/hooks/useAuth';
import { toast } from 'react-toastify';
import FormInput from '@/app/components/auth/FormInput';
import FormButton from '@/app/components/auth/FormButton';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors }, trigger, getValues, setValue, watch } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'patient'
    }
  });

  const { register: registerUser, loading, error } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  
  // Watch for form value changes
  const roleValue = watch('role');
  
  // Keep selectedRole in sync with form value
  useEffect(() => {
    setSelectedRole(roleValue as UserRole);
  }, [roleValue]);

  // Handle advancing to step 2
  const handleContinueToStep2 = async () => {
    // Manually validate the fields from step 1
    const isValid = await trigger(['firstName', 'lastName', 'email']);
    
    if (isValid) {
      setStep(2);
    }
  };

  // Handle final submission
  const handleRegistration = async (data: RegisterFormData) => {
    try {
      await registerUser(data);
      // Toast is already shown in the useAuth hook
    } catch (err) {
      toast.error(error || 'Failed to register. Please try again.');
    }
  };

  // Combined handler for form submission
  const onSubmit = async (data: RegisterFormData) => {
    if (step === 1) {
      await handleContinueToStep2();
    } else {
      await handleRegistration(data);
    }
  };

  const roleOptions: Array<{ value: UserRole; label: string; description: string; icon: JSX.Element }> = [
    {
      value: 'patient',
      label: 'Patient',
      description: 'Schedule appointments, consult with doctors, manage your health',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      value: 'doctor',
      label: 'Doctor',
      description: 'Conduct video consultations, manage appointments, communicate with patients',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Form */}
      <div className="md:w-1/2 flex items-center justify-center p-8 md:p-16 order-2 md:order-1">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-primary-600">MedConnect</h1>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Create Your Account</h2>
            <p className="text-gray-600 mt-2">Join MedConnect and get started with telemedicine</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex mb-8">
            <div className="w-1/2">
              <div className={`h-1 ${step >= 1 ? 'bg-primary-600' : 'bg-gray-200'} rounded-l`}></div>
              <div className="text-xs text-center mt-1 text-gray-600">Personal Info</div>
            </div>
            <div className="w-1/2">
              <div className={`h-1 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'} rounded-r`}></div>
              <div className="text-xs text-center mt-1 text-gray-600">Role & Password</div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FormInput
                  label="First Name"
                  error={errors.firstName}
                  {...register('firstName')}
                  placeholder="John"
                  autoComplete="given-name"
                  required
                />

                <FormInput
                  label="Last Name"
                  error={errors.lastName}
                  {...register('lastName')}
                  placeholder="Doe"
                  autoComplete="family-name"
                  required
                />

                <FormInput
                  label="Email"
                  type="email"
                  error={errors.email}
                  {...register('email')}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />

                <FormButton 
                  type="button" 
                  fullWidth
                  onClick={handleContinueToStep2}
                >
                  Continue
                </FormButton>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select your role</label>
                  <div className="grid grid-cols-1 gap-3">
                    {roleOptions.map((role) => (
                      <div
                        key={role.value}
                        className={`
                          flex items-center p-3 border rounded-lg cursor-pointer transition-all
                          ${errors.role && 'border-danger-500'}
                          ${selectedRole === role.value 
                            ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200' 
                            : 'border-gray-200 hover:border-primary-300'}
                        `}
                        onClick={() => {
                          // Update both the form value and the UI state
                          setValue('role', role.value, { shouldValidate: true });
                          setSelectedRole(role.value);
                          console.log('Selected role:', role.value);
                        }}
                      >
                        <input
                          type="radio"
                          id={`role-${role.value}`}
                          value={role.value}
                          className="sr-only"
                          checked={selectedRole === role.value}
                          {...register('role')}
                        />
                        <div className="flex items-start w-full">
                          <div className="flex-shrink-0 mt-0.5">
                            {role.icon}
                          </div>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">{role.label}</div>
                            <div className="text-sm text-gray-500">{role.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {errors.role && (
                    <p className="mt-1 text-sm text-danger-600">{errors.role.message}</p>
                  )}
                </div>

                <FormInput
                  label="Password"
                  type="password"
                  error={errors.password}
                  {...register('password')}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  showPasswordToggle
                  required
                />

                <FormInput
                  label="Confirm Password"
                  type="password"
                  error={errors.confirmPassword}
                  {...register('confirmPassword')}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  showPasswordToggle
                  required
                />

                <div className="flex space-x-3">
                  <FormButton 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)}
                  >
                    Back
                  </FormButton>
                  <FormButton 
                    type="submit" 
                    fullWidth 
                    isLoading={loading}
                  >
                    Create Account
                  </FormButton>
                </div>
              </motion.div>
            )}

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Right Side - Image */}
      <div className="md:w-1/2 bg-primary-600 flex items-center justify-center p-8 md:p-16 order-1 md:order-2">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-md text-white"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Transform Your Healthcare Experience
          </h1>
          <p className="mb-8 text-primary-100">
            Join thousands of patients and healthcare providers on MedConnect's secure telemedicine platform.
          </p>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 space-y-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary-600 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">End-to-end encryption</h3>
                <p className="text-sm text-primary-100">Your health data is secure and private</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary-600 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Expert medical network</h3>
                <p className="text-sm text-primary-100">Connect with certified healthcare providers</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary-600 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Improved patient care</h3>
                <p className="text-sm text-primary-100">Quality healthcare from the comfort of home</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 