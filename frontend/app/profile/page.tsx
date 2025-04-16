'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { useAuth } from '../hooks/useAuth';
import { UpdateProfileFormData } from '../types/auth';
import { updateProfileSchema } from '../lib/auth/validation';
import AuthLayout from '../components/layout/AuthLayout';
import FormInput from '../components/auth/FormInput';
import FormButton from '../components/auth/FormButton';

const specializationOptions = [
  { value: '', label: 'Select a specialization' },
  { value: 'Cardiology', label: 'Cardiology' },
  { value: 'Dermatology', label: 'Dermatology' },
  { value: 'Endocrinology', label: 'Endocrinology' },
  { value: 'Gastroenterology', label: 'Gastroenterology' },
  { value: 'General Practice', label: 'General Practice' },
  { value: 'Neurology', label: 'Neurology' },
  { value: 'Obstetrics & Gynecology', label: 'Obstetrics & Gynecology' },
  { value: 'Oncology', label: 'Oncology' },
  { value: 'Ophthalmology', label: 'Ophthalmology' },
  { value: 'Orthopedics', label: 'Orthopedics' },
  { value: 'Pediatrics', label: 'Pediatrics' },
  { value: 'Psychiatry', label: 'Psychiatry' },
  { value: 'Pulmonology', label: 'Pulmonology' },
  { value: 'Radiology', label: 'Radiology' },
  { value: 'Urology', label: 'Urology' },
];

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { updateProfile, loading, error } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      profileImage: '',
      specialization: '',
    }
  });

  useEffect(() => {
    console.log('User data in profile page:', user);
    if (user) {
      setValue('firstName', user.firstName);
      setValue('lastName', user.lastName);
      if (user.specialization) {
        console.log('Setting specialization value to:', user.specialization);
        setValue('specialization', user.specialization);
      }
      if (user.profileImage) {
        setValue('profileImage', user.profileImage);
        setImagePreview(user.profileImage);
      }
    }
  }, [user, setValue]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64 string for preview and form value
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setValue('profileImage', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: UpdateProfileFormData) => {
    console.log('Submitting profile form with data:', data);
    try {
      const updatedUser = await updateProfile(data);
      console.log('Profile updated, received user data:', updatedUser);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(error || 'Failed to update profile. Please try again.');
    }
  };

  return (
    <AuthLayout>
      <div className="bg-gray-50 min-h-screen p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-primary-500 py-8 px-6 text-white">
                <h1 className="text-2xl font-bold">Profile Settings</h1>
                <p className="opacity-90">Manage your account information</p>
              </div>
              
              <div className="p-6 md:p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Profile Image */}
                  <div className="flex flex-col items-center justify-center mb-6">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg mb-4">
                        {imagePreview ? (
                          <img 
                            src={imagePreview} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary-50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <label className="absolute bottom-4 right-0 bg-primary-600 text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-primary-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageChange}
                        />
                      </label>
                    </div>
                    <p className="text-sm text-gray-500">Click to upload a profile photo</p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <FormInput
                        label="First Name"
                        error={errors.firstName}
                        {...register('firstName')}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <FormInput
                        label="Last Name"
                        error={errors.lastName}
                        {...register('lastName')}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>

                  {/* Email - Read Only */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="input-field bg-gray-50"
                      value={user?.email || ''}
                      readOnly
                      disabled
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Email cannot be changed. Please contact support for assistance.
                    </p>
                  </div>

                  {/* Role - Read Only */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <input
                      type="text"
                      className="input-field bg-gray-50"
                      value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                      readOnly
                      disabled
                    />
                  </div>

                  {/* Specialization - For Doctors Only */}
                  {user?.role === 'doctor' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                      <select
                        className="input-field"
                        {...register('specialization')}
                      >
                        {specializationOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {errors.specialization && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.specialization.message}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Choose your medical specialization to help patients find you
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <FormButton 
                      type="button" 
                      variant="outline" 
                      onClick={() => reset({
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        profileImage: user?.profileImage || '',
                        specialization: user?.specialization || '',
                      })}
                      disabled={loading}
                    >
                      Cancel
                    </FormButton>
                    <FormButton 
                      type="submit" 
                      isLoading={loading}
                    >
                      Save Changes
                    </FormButton>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AuthLayout>
  );
} 