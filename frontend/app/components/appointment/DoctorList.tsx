import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DoctorCard from './DoctorCard';
import { useDoctors } from '../../hooks/useDoctors';
import { Doctor } from '../../types/appointment';

// Sample specializations (in a real app, these would come from the backend)
const SPECIALIZATIONS = [
  'All',
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Pediatrics',
  'Orthopedics',
  'Ophthalmology',
  'Psychiatry',
  'Gynecology'
];

export default function DoctorList() {
  const { doctors, loading, error, fetchDoctors, fetchDoctorsBySpecialization } = useDoctors();
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    if (doctors) {
      let filtered = [...doctors];
      
      // Filter by search term
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (doctor) =>
            doctor.firstName.toLowerCase().includes(lowerSearchTerm) ||
            doctor.lastName.toLowerCase().includes(lowerSearchTerm) ||
            doctor.specialization.toLowerCase().includes(lowerSearchTerm)
        );
      }
      
      setFilteredDoctors(filtered);
    }
  }, [doctors, searchTerm]);

  const handleSpecializationChange = async (specialization: string) => {
    setSelectedSpecialization(specialization);
    
    if (specialization === 'All') {
      fetchDoctors();
    } else {
      fetchDoctorsBySpecialization(specialization);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  if (loading && !doctors.length) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && !doctors.length) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">Failed to load doctors</p>
        <button 
          className="bg-primary-600 text-white px-4 py-2 rounded-lg"
          onClick={() => fetchDoctors()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div className="relative w-full md:w-1/3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="Search doctors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex overflow-x-auto pb-2 md:pb-0 space-x-2">
            {SPECIALIZATIONS.map((specialization) => (
              <button
                key={specialization}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  selectedSpecialization === specialization
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => handleSpecializationChange(specialization)}
              >
                {specialization}
              </button>
            ))}
          </div>
        </div>
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doctor) => (
              <motion.div key={doctor.userId} variants={itemVariants} layout>
                <DoctorCard doctor={doctor} />
              </motion.div>
            ))
          ) : (
            <motion.div 
              className="col-span-full text-center py-12"
              variants={itemVariants}
            >
              <p className="text-gray-500">No doctors found matching your criteria</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
} 