import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAppointments } from '../../hooks/useAppointments';
import { useSchedules } from '../../hooks/useSchedules';
import { useAuthStore } from '../../store/authStore';
import { Appointment } from '../../types/appointment';

export default function DoctorDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { fetchDoctorSchedules, loading: schedulesLoading } = useSchedules();
  const { fetchDoctorAppointments, loading: appointmentsLoading } = useAppointments();
  
  const [scheduleCount, setScheduleCount] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulesError, setSchedulesError] = useState(false);
  const [hasAttemptedSchedules, setHasAttemptedSchedules] = useState(false);
  
  useEffect(() => {
    if (user && user.userId && !hasAttemptedSchedules) {
      loadDashboardData();
    }
  }, [user, hasAttemptedSchedules]);
  
  const loadDashboardData = async () => {
    if (!user || !user.userId) return;
    
    setLoading(true);
    setHasAttemptedSchedules(true);
    
    try {
      // Fetch doctor schedules
      try {
        const schedulesData = await fetchDoctorSchedules(user.userId);
        if (schedulesData) {
          setScheduleCount(schedulesData.count || 0);
        }
      } catch (scheduleErr: any) {
        console.error('Error fetching schedules:', scheduleErr);
        setSchedulesError(true);
        // If it's a 404, just set schedule count to 0 and continue
        if (scheduleErr.status === 404) {
          setScheduleCount(0);
        }
      }
      
      // Fetch today's appointments
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      
      try {
        const appointmentsData = await fetchDoctorAppointments(
          user.userId,
          startOfToday.toISOString(),
          endOfToday.toISOString()
        );
        
        if (appointmentsData && appointmentsData.appointments) {
          setTodayAppointments(appointmentsData.appointments.length);
          setRecentAppointments(appointmentsData.appointments.slice(0, 5));
        }
      } catch (appointmentErr) {
        console.error('Error fetching today\'s appointments:', appointmentErr);
        setTodayAppointments(0);
        setRecentAppointments([]);
      }
      
      // Fetch upcoming appointments (next 7 days)
      const oneWeekLater = new Date();
      oneWeekLater.setDate(now.getDate() + 7);
      
      try {
        const upcomingData = await fetchDoctorAppointments(
          user.userId,
          startOfToday.toISOString(),
          oneWeekLater.toISOString()
        );
        
        if (upcomingData && upcomingData.appointments) {
          setUpcomingAppointments(upcomingData.appointments.length);
        }
      } catch (upcomingErr) {
        console.error('Error fetching upcoming appointments:', upcomingErr);
        setUpcomingAppointments(0);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const formatAppointmentTime = (isoTime: string): string => {
    if (!isoTime) return '';
    
    const date = new Date(isoTime);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-6"
      >
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="rounded-full w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Today's Appointments</h3>
              <p className="text-2xl font-bold text-gray-800">{todayAppointments}</p>
            </div>
          </div>
          <button
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
            onClick={() => router.push('/appointments')}
          >
            View all appointments →
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="rounded-full w-12 h-12 flex items-center justify-center bg-green-50 text-green-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">My Schedules</h3>
              <p className="text-2xl font-bold text-gray-800">{scheduleCount}</p>
            </div>
          </div>
          <button
            className="mt-4 text-sm text-green-600 hover:text-green-800 font-medium"
            onClick={() => router.push('/schedule')}
          >
            Manage schedules →
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="rounded-full w-12 h-12 flex items-center justify-center bg-purple-50 text-purple-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Upcoming (7 days)</h3>
              <p className="text-2xl font-bold text-gray-800">{upcomingAppointments}</p>
            </div>
          </div>
          <button
            className="mt-4 text-sm text-purple-600 hover:text-purple-800 font-medium"
            onClick={() => router.push('/appointments')}
          >
            View calendar →
          </button>
        </div>
      </motion.div>
      
      {recentAppointments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Appointments</h3>
          <div className="divide-y divide-gray-100">
            {recentAppointments.map((appointment) => (
              <div key={appointment.appointmentId} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-800">
                    {appointment.patientName || 'Patient'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatAppointmentTime(appointment.startTime)}
                  </p>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {appointment.status || 'pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/schedule')}
              className="w-full flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add New Schedule</span>
            </button>
            
            <button
              onClick={() => router.push('/appointments/new')}
              className="w-full flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Create New Appointment</span>
            </button>
            
            <button
              onClick={() => router.push('/profile')}
              className="w-full flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Update Profile</span>
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Working Hours Overview</h3>
          {scheduleCount === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You haven't set up your schedule yet.</p>
              <button
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                onClick={() => router.push('/schedule')}
              >
                Set Up Schedule
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                You have {scheduleCount} active schedule{scheduleCount !== 1 ? 's' : ''}.
              </p>
              <p className="text-sm text-gray-600">
                Manage your availability to ensure patients can book appointments during your preferred hours.
              </p>
              <button
                className="mt-4 text-sm text-primary-600 hover:text-primary-800 font-medium"
                onClick={() => router.push('/schedule')}
              >
                View all schedules →
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
} 