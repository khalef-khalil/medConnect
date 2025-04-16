'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AuthLayout from '../../components/layout/AuthLayout';
import { useMessaging } from '../../hooks/useMessaging';
import { useDoctors } from '../../hooks/useDoctors';
import { Doctor } from '../../types/appointment';

export default function NewConversationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const doctorId = searchParams.get('doctorId');
  
  const { startConversation, loading: messageLoading } = useMessaging();
  const { fetchDoctorById, doctor, loading: doctorLoading } = useDoctors();
  
  const [subject, setSubject] = useState('Medical Consultation');
  const [initialMessage, setInitialMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (doctorId) {
      fetchDoctorById(doctorId);
    }
  }, [doctorId, fetchDoctorById]);

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!doctorId) {
      setError('Doctor information is missing');
      return;
    }
    
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    
    try {
      const conversation = await startConversation(doctorId, subject);
      if (conversation) {
        router.push(`/messages?conversationId=${conversation.conversationId}`);
      }
    } catch (err) {
      setError('Failed to start conversation');
      console.error(err);
    }
  };

  const isLoading = doctorLoading || messageLoading;

  return (
    <AuthLayout>
      <div className="p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <button
              className="flex items-center text-primary-600 mb-6 hover:underline"
              onClick={() => router.back()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              Start a New Conversation
            </h1>
            <p className="text-gray-600 mb-8">
              Send a secure message to your healthcare provider.
            </p>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : !doctor ? (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-4">Doctor not found</p>
                  <button 
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg"
                    onClick={() => router.push('/doctors')}
                  >
                    Browse Doctors
                  </button>
                </div>
              ) : (
                <form onSubmit={handleStartConversation}>
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-4">
                      Starting conversation with Dr. {doctor.firstName} {doctor.lastName}
                    </h2>
                    
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                      <p className="text-gray-700">
                        <span className="font-medium">Specialization:</span> {doctor.specialization}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Email:</span> {doctor.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="subject" className="block text-gray-700 font-medium mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="message" className="block text-gray-700 font-medium mb-2">
                      Initial Message (Optional)
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      value={initialMessage}
                      onChange={(e) => setInitialMessage(e.target.value)}
                      placeholder="Type your message here..."
                    />
                  </div>
                  
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-lg">
                      {error}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-medium transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Starting Conversation...' : 'Start Conversation'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AuthLayout>
  );
} 