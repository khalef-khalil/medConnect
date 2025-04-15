'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ForgotPasswordFormData } from '@/app/types/auth';
import { forgotPasswordSchema } from '@/app/lib/auth/validation';
import { useAuth } from '@/app/hooks/useAuth';
import { toast } from 'react-toastify';
import FormInput from '@/app/components/auth/FormInput';
import FormButton from '@/app/components/auth/FormButton';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  });

  const { forgotPassword, loading, error } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPassword(data);
      setIsSuccess(true);
      toast.success('Password reset instructions sent to your email');
    } catch (err) {
      toast.error(error || 'Failed to send reset instructions. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Form */}
      <div className="md:w-1/2 flex items-center justify-center p-8 md:p-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-primary-600">MedConnect</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Forgot Password</h2>
            <p className="text-gray-600 mt-2">
              {isSuccess 
                ? 'Check your email for reset instructions' 
                : 'We'll send you password reset instructions'}
            </p>
          </div>

          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary-50 border border-primary-200 rounded-lg p-6 text-center"
            >
              <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Check Your Email</h3>
              <p className="text-gray-600 mb-6">
                We've sent password reset instructions to your email address. Please check your inbox.
              </p>
              <div className="flex flex-col space-y-3">
                <Link href="/auth/login">
                  <FormButton type="button" fullWidth>
                    Return to Login
                  </FormButton>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsSuccess(false)}
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Did not receive the email? Try again
                </button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <FormInput
                label="Email"
                type="email"
                error={errors.email}
                {...register('email')}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />

              <FormButton type="submit" fullWidth isLoading={loading}>
                Send Reset Instructions
              </FormButton>

              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  Return to login
                </Link>
              </div>
            </form>
          )}
        </motion.div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-primary-700 to-primary-500 items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-md p-12 text-white"
        >
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">Secure Account Recovery</h2>
            <p className="text-center text-primary-100">
              We prioritize your security and privacy. Your account information and medical data are protected with industry-standard encryption.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-3">Password Requirements</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                At least 8 characters
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                At least one uppercase letter
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                At least one lowercase letter
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                At least one number
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                At least one special character
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}