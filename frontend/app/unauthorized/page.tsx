'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import FormButton from '../components/auth/FormButton';

export default function UnauthorizedPage() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary-600">MedConnect</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-danger-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/dashboard">
              <FormButton type="button" fullWidth>
                Go to Dashboard
              </FormButton>
            </Link>
            <button 
              onClick={logout}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          For support, please contact <a href="mailto:support@medconnect.com" className="text-primary-600">support@medconnect.com</a>
        </p>
      </motion.div>
    </div>
  );
} 