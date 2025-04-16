'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

// Define validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  });

  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSuccess(true);
      toast.success('Password reset instructions sent to your email');
    } catch (err) {
      setError('Failed to send reset instructions. Please try again.');
      toast.error('Failed to send reset instructions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="md:w-1/2 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-primary-600">MedConnect</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Forgot Password</h2>
            <p className="text-gray-600 mt-2">
              {isSuccess 
                ? 'Check your email for reset instructions' 
                : 'We will send you password reset instructions'}
            </p>
          </div>

          {isSuccess ? (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Check Your Email</h3>
              <p className="text-gray-600 mb-6">
                We&apos;ve sent password reset instructions to your email address.
              </p>
              <div className="flex flex-col space-y-3">
                <Link href="/auth/login" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full text-center">
                  Return to Login
                </Link>
                <button
                  type="button"
                  onClick={() => setIsSuccess(false)}
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Did not receive the email? Try again
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Reset Instructions'
                )}
              </button>

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
        </div>
      </div>

      <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-primary-700 to-primary-500 items-center justify-center">
        <div className="max-w-md p-12 text-white">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-center mb-2">Secure Account Recovery</h2>
            <p className="text-center text-primary-100">
              We prioritize your security and privacy. Your account information and medical data are protected with industry-standard encryption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}