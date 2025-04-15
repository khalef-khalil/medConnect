'use client';

import React from 'react';
import { motion } from 'framer-motion';
import AuthLayout from '../components/layout/AuthLayout';
import DoctorList from '../components/appointment/DoctorList';

export default function DoctorsPage() {
  return (
    <AuthLayout>
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              Find a Doctor
            </h1>
            <p className="text-gray-600 mb-8">
              Browse our network of qualified healthcare professionals and book an appointment.
            </p>
            
            <DoctorList />
          </motion.div>
        </div>
      </div>
    </AuthLayout>
  );
} 