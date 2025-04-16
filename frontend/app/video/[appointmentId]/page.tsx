'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AuthLayout from '../../components/layout/AuthLayout';
import WaitingRoom from '../../components/video/WaitingRoom';
import ParticipantVideo from '../../components/video/ParticipantVideo';
import VideoControls from '../../components/video/VideoControls';
import DoctorWaitingRoom from '../../components/video/DoctorWaitingRoom';
import { useVideo } from '../../hooks/useVideo';
import { useAppointments } from '../../hooks/useAppointments';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-toastify';

interface VideoPageProps {
  params: {
    appointmentId: string;
  };
}

interface Participant {
  userId: string;
  name: string;
  stream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking: boolean;
}

interface WaitingPatient {
  userId: string;
  firstName: string;
  lastName: string;
  waitingSince: number;
}

export default function VideoPage({ params }: VideoPageProps) {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { session, loading, error, createVideoSession, getVideoSession, joinWaitingRoom, admitPatient, toggleScreenSharing } = useVideo();
  const { appointment, fetchAppointmentById } = useAppointments();
  
  const [isWaiting, setIsWaiting] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waitingPatients, setWaitingPatients] = useState<WaitingPatient[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const isDoctor = user?.role === 'doctor';
  const initRef = useRef(false);
  const sessionInitialized = useRef(false);
  
  // Track patient admission status
  const [patientAdmitted, setPatientAdmitted] = useState<boolean>(false);
  
  // Handle authentication errors
  useEffect(() => {
    if (error && (error.includes('session has expired') || error.includes('Invalid authentication'))) {
      toast.error('Your session has expired. Please login again.');
      clearAuth();
      router.push('/auth/login');
    }
  }, [error, clearAuth, router]);
  
  // Fetch appointment details only once when component mounts
  useEffect(() => {
    const getAppointment = async () => {
      await fetchAppointmentById(params.appointmentId);
    };
    
    if (!appointment) {
      getAppointment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.appointmentId]);
  
  // Setup local stream for active calls
  useEffect(() => {
    if (isCallActive && !localStream) {
      const setupLocalStream = async () => {
        try {
          // Check if navigator.mediaDevices is available
          if (!navigator.mediaDevices) {
            console.error('MediaDevices API not available in this browser or context');
            toast.error('Camera access not available. Make sure you are using a modern browser with HTTPS');
            // Fallback for when media devices aren't available - create a placeholder participant
            if (user) {
              setParticipants(prev => [
                ...prev,
                {
                  userId: user.userId,
                  name: `${user.firstName} ${user.lastName}`,
                  stream: null,
                  isMuted: false,
                  isCameraOff: true,
                  isSpeaking: false
                }
              ]);
            }
            return;
          }
          
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true
            });
            
            setLocalStream(stream);
            
            // Add self as participant
            if (user) {
              setParticipants(prev => [
                ...prev,
                {
                  userId: user.userId,
                  name: `${user.firstName} ${user.lastName}`,
                  stream,
                  isMuted: false,
                  isCameraOff: false,
                  isSpeaking: false
                }
              ]);
            }
          } catch (error: any) {
            console.error('Error accessing media devices:', error);
            
            // Provide more specific error messages based on the error
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
              toast.error('Camera or microphone access denied. Please allow access in your browser settings.');
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
              toast.error('No camera or microphone found. Please connect a device and try again.');
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
              toast.error('Your camera or microphone is already in use by another application.');
            } else if (error.name === 'OverconstrainedError') {
              toast.error('Unable to find media devices that meet the required constraints.');
            } else if (error.name === 'TypeError' || (error.message && error.message.includes('HTTPS'))) {
              toast.error('Camera access requires HTTPS. Please use a secure connection.');
            } else {
              toast.error('Error accessing your camera and microphone. Please check your browser settings.');
            }
            
            // Still create a participant with camera off
            if (user) {
              setParticipants(prev => [
                ...prev,
                {
                  userId: user.userId,
                  name: `${user.firstName} ${user.lastName}`,
                  stream: null,
                  isMuted: false,
                  isCameraOff: true,
                  isSpeaking: false
                }
              ]);
            }
          }
          
          // The rest of your code for adding other participants remains the same
          // If both participants aren't already in the call list, add the other participant
          if (appointment && participants.length < 2) {
            const otherParticipantId = isDoctor ? appointment.patientId : appointment.doctorId;
            const currentParticipantIds = participants.map(p => p.userId);
            
            if (!currentParticipantIds.includes(otherParticipantId)) {
              const otherParticipantName = isDoctor ? 
                (appointment.patientDetails ? `${appointment.patientDetails.firstName} ${appointment.patientDetails.lastName}` : 'Patient') :
                (appointment.doctorDetails ? `Dr. ${appointment.doctorDetails.firstName} ${appointment.doctorDetails.lastName}` : 'Doctor');
              
              // In a real implementation, this would connect to the remote peer
              // For this demo, we're creating a placeholder for the other participant
              setParticipants(prev => [
                ...prev,
                {
                  userId: otherParticipantId,
                  name: otherParticipantName,
                  stream: null, // Would be the remote stream in a real implementation
                  isMuted: false,
                  isCameraOff: true,
                  isSpeaking: false
                }
              ]);
            }
          }
        } catch (err) {
          console.error('Error in setupLocalStream:', err);
          toast.error('An unexpected error occurred. Please refresh and try again.');
        }
      };
      
      setupLocalStream();
    }
    
    return () => {
      // Cleanup local stream when component unmounts
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCallActive, appointment, isDoctor, user, participants]);
  
  // Initialize video session with better error handling
  useEffect(() => {
    const initSession = async () => {
      if (!appointment || !user || sessionInitialized.current) return;
      
      sessionInitialized.current = true;
      
      try {
        console.log("Initializing video session...");
        // Try to get an existing session first
        const existingSession = await getVideoSession(params.appointmentId);
        
        if (!existingSession) {
          console.log("No existing session, creating or joining...");
          // If no session exists and user is a doctor, create one
          if (isDoctor) {
            console.log("User is doctor, creating session...");
            const created = await createVideoSession(params.appointmentId);
            if (!created && error) {
              console.error("Failed to create session:", error);
              if (error.includes('session has expired') || error.includes('Invalid authentication')) {
                // Let the error effect handler deal with this
                return;
              }
            }
            // For demo purposes, just show the doctor waiting room
            // The active call will be triggered when they admit a patient
          } else {
            console.log("User is patient, joining waiting room...");
            // If user is a patient, join waiting room
            const joined = await joinWaitingRoom(params.appointmentId);
            if (!joined && error) {
              console.error("Failed to join waiting room:", error);
              if (error.includes('session has expired') || error.includes('Invalid authentication')) {
                // Let the error effect handler deal with this
                return;
              }
            }
            setIsWaiting(true);
          }
        } else {
          console.log("Found existing session:", 
            {
              sessionId: existingSession.sessionId,
              status: existingSession.status,
              webrtcConfig: existingSession.webrtcConfig ? {
                role: existingSession.webrtcConfig.role,
                waitingRoomEnabled: existingSession.webrtcConfig.waitingRoomEnabled
              } : null
            }
          );
          
          // Check if a proper video session was returned with webrtcConfig
          if (existingSession.webrtcConfig) {
            // Initialize WebRTC with the provided configuration
            console.log("Session has WebRTC config, setting up connection...");
            
            // If doctor, check for patients in waiting room
            if (isDoctor) {
              // Fetch waiting room patients
              console.log("Doctor view: Checking for patients in the waiting room");
              
              // Make sure we have appointment and patient details
              if (appointment && appointment.patientId) {
                // Log the exact patient details we're adding to waiting room
                console.log("Setting up waiting room with patient:", {
                  patientId: appointment.patientId,
                  firstName: appointment.patientDetails?.firstName || 'Unknown',
                  lastName: appointment.patientDetails?.lastName || 'Patient'
                });
                
                setWaitingPatients([
                  {
                    userId: appointment.patientId, // Make sure this is the correct patient ID
                    firstName: appointment.patientDetails?.firstName || 'Patient',
                    lastName: appointment.patientDetails?.lastName || '',
                    waitingSince: Date.now() - 30000 // 30 seconds ago for demo
                  }
                ]);
              } else {
                console.warn("No patient ID found in appointment data");
              }
            } else {
              // If patient, check if they've been admitted already
              if (existingSession.webrtcConfig.role === 'patient' && 
                  !existingSession.webrtcConfig.waitingRoomEnabled) {
                console.log("Patient has been admitted, joining call immediately");
                setIsCallActive(true);
              } else {
                // Check if patient has stored ready state
                const storedReady = localStorage.getItem('patientReady');
                if (storedReady) {
                  try {
                    const readyData = JSON.parse(storedReady);
                    const isCurrentAppointment = readyData.appointmentTime === appointment.startTime;
                    const isRecent = Date.now() - readyData.timestamp < 3600000; // 1 hour
                    
                    if (isCurrentAppointment && isRecent) {
                      // If patient was previously ready, show waiting room
                      console.log("Patient was previously ready, rejoining waiting room");
                      setIsWaiting(true);
                    }
                  } catch (e) {
                    // Invalid data, ignore
                    localStorage.removeItem('patientReady');
                  }
                } else {
                  // If patient, join waiting room
                  console.log("Patient joining waiting room...");
                  setIsWaiting(true);
                }
              }
            }
          } else {
            console.warn("Session exists but has no WebRTC config");
          }
        }
      } catch (error) {
        console.error("Failed to initialize session:", error);
      }
    };

    if (appointment && user && !sessionInitialized.current) {
      initSession();
    }
  }, [appointment, user, params.appointmentId, getVideoSession, createVideoSession, joinWaitingRoom, isDoctor, error]);
  
  // Setup polling for patient to check admission status with better error handling
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let errorCount = 0;
    const maxErrors = 3;
    const pollInterval = 3000; // Reduce to 3 seconds for faster detection
    
    const checkAdmissionStatus = async () => {
      if (!isWaiting || isCallActive || isDoctor) return;
      
      try {
        console.log(`[checkAdmissionStatus] Patient (${user?.userId}) checking admission status for appointment ${params.appointmentId}`);
        const currentSession = await getVideoSession(params.appointmentId);
        
        // Debug log the session details
        if (currentSession) {
          console.log(`[checkAdmissionStatus] Got session:`, {
            sessionId: currentSession.sessionId,
            hasWebRTCConfig: !!currentSession.webrtcConfig,
            role: currentSession.webrtcConfig?.role,
            waitingRoomEnabled: currentSession.webrtcConfig?.waitingRoomEnabled,
            updated: currentSession.updatedAt || 'No update time'
          });
        } else {
          console.log(`[checkAdmissionStatus] No session returned`);
        }
        
        // Reset error count on successful request
        errorCount = 0;
        
        // Check if patient has been admitted (waitingRoomEnabled is false)
        const isAdmitted = currentSession && 
          currentSession.webrtcConfig && 
          currentSession.webrtcConfig.role === 'patient' && 
          !currentSession.webrtcConfig.waitingRoomEnabled;
        
        if (isAdmitted) {
          console.log("[checkAdmissionStatus] Patient has been admitted to the call!");
          
          // Save admission state to local storage
          localStorage.setItem('patientAdmitted', JSON.stringify({
            appointmentId: params.appointmentId,
            timestamp: Date.now()
          }));
          
          // Update UI state immediately
          setIsWaiting(false);
          setIsCallActive(true);
          setPatientAdmitted(true);
          
          // Show a toast notification
          toast.success("Doctor has admitted you to the call");
          
          // Clear interval since we're now admitted
          if (intervalId) {
            clearInterval(intervalId);
          }
        } else {
          console.log("[checkAdmissionStatus] Patient still waiting for admission");
          
          // If session exists but doesn't show admission yet, check again sooner
          // This helps detect quick changes in session state
          if (currentSession && intervalId) {
            clearInterval(intervalId);
            intervalId = setInterval(checkAdmissionStatus, pollInterval);
          }
        }
      } catch (err) {
        errorCount++;
        console.error(`[checkAdmissionStatus] Error checking admission status (${errorCount}/${maxErrors}):`, err);
        
        // If we've reached the max errors, stop polling
        if (errorCount >= maxErrors) {
          console.error("[checkAdmissionStatus] Too many errors, stopping admission status checks");
          clearInterval(intervalId);
          
          // Show reconnect option to user
          toast.error(
            "Connection lost. Please refresh the page to reconnect.", 
            { 
              autoClose: false,
              closeOnClick: false,
              draggable: false
            }
          );
        }
      }
    };
    
    if (isWaiting && !isDoctor) {
      console.log("[checkAdmissionStatus] Starting admission status polling");
      // Run immediately
      checkAdmissionStatus();
      // Then at intervals
      intervalId = setInterval(checkAdmissionStatus, pollInterval);
    }
    
    return () => {
      if (intervalId) {
        console.log("[checkAdmissionStatus] Cleaning up interval");
        clearInterval(intervalId);
      }
    };
  }, [isWaiting, isCallActive, isDoctor, params.appointmentId, getVideoSession, user?.userId]);
  
  const handleReadyForCall = async () => {
    try {
      console.log("Patient is ready for call, joining waiting room...");
      
      // Join waiting room through API
      await joinWaitingRoom(params.appointmentId);
      
      // Begin polling for admission
      setIsWaiting(true);
      
      // Clear any previously admitted status
      setPatientAdmitted(false);
      
      console.log("Patient joined waiting room successfully");
    } catch (error) {
      console.error("Failed to join waiting room:", error);
    }
  };
  
  const handleAdmitPatient = async (patientId: string) => {
    try {
      console.log(`[handleAdmitPatient] Doctor (${user?.userId}) admitting patient (${patientId})`);
      console.log(`[handleAdmitPatient] Appointment ID: ${params.appointmentId}`);
      
      // Show admission in progress
      toast.info("Admitting patient to the call...");
      
      // Refresh appointment data to ensure we have the latest
      await fetchAppointmentById(params.appointmentId);
      
      // Verify we have the appointment data loaded
      if (!appointment) {
        console.error(`[handleAdmitPatient] Appointment data not loaded for ID: ${params.appointmentId}`);
        toast.error("Appointment data not available. Please refresh the page.");
        return;
      }
      
      console.log(`[handleAdmitPatient] Loaded appointment data:`, {
        appointmentId: appointment.appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        waitingPatientIds: waitingPatients.map(p => p.userId)
      });
      
      // Always use the patientId from the appointment data
      // This ensures we're using the correct ID regardless of what's in the waiting room UI
      const correctPatientId = appointment.patientId;
      
      if (correctPatientId !== patientId) {
        console.warn(`[handleAdmitPatient] Patient ID mismatch! Appointment patient: ${correctPatientId}, Waiting room patient: ${patientId}`);
        patientId = correctPatientId;
        console.log(`[handleAdmitPatient] Using appointment's patient ID instead: ${patientId}`);
      }

      console.log(`[handleAdmitPatient] Making API call to admit patient ${patientId} for appointment ${params.appointmentId}`);
      const admitResult = await admitPatient(params.appointmentId, patientId);
      
      if (admitResult) {
        console.log(`[handleAdmitPatient] Successfully admitted patient:`, admitResult);
        
        // Update UI
        setWaitingPatients([]);
        setIsCallActive(true);
        toast.success("Patient admitted to call successfully");
        
        // Force update session to make sure changes are picked up by both sides
        try {
          console.log('[handleAdmitPatient] Refreshing session to confirm changes are applied');
          const refreshedSession = await getVideoSession(params.appointmentId);
          console.log('[handleAdmitPatient] Refreshed session:', refreshedSession ? {
            waitingRoomEnabled: refreshedSession.webrtcConfig?.waitingRoomEnabled,
            sessionId: refreshedSession.sessionId
          } : 'No session returned');
        } catch (refreshError) {
          console.error('[handleAdmitPatient] Error refreshing session:', refreshError);
        }
      } else {
        console.error(`[handleAdmitPatient] Failed to admit patient - no result returned`);
        toast.error("Failed to admit patient. Please try again.");
      }
    } catch (error) {
      console.error(`[handleAdmitPatient] Error admitting patient:`, error);
      toast.error("An error occurred while admitting the patient");
    }
  };
  
  const handleToggleMicrophone = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isMicrophoneOn;
      });
      
      setIsMicrophoneOn(!isMicrophoneOn);
      
      // Update self in participants
      setParticipants(prev => 
        prev.map(p => 
          p.userId === user?.userId ? { ...p, isMuted: isMicrophoneOn } : p
        )
      );
    }
  };
  
  const handleToggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isCameraOn;
      });
      
      setIsCameraOn(!isCameraOn);
      
      // Update self in participants
      setParticipants(prev => 
        prev.map(p => 
          p.userId === user?.userId ? { ...p, isCameraOff: isCameraOn } : p
        )
      );
    }
  };
  
  const handleToggleScreenShare = async () => {
    try {
      // Check if screen sharing is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        console.error('Screen sharing is not supported in this browser or context');
        toast.error('Screen sharing is not supported in your browser');
        return;
      }
      
      if (isScreenSharing) {
        // If already screen sharing, switch back to camera
        if (localStream) {
          // Stop all tracks on the screen share stream
          localStream.getTracks().forEach(track => track.stop());
        }
        
        // Get a new camera stream
        if (navigator.mediaDevices) {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          
          setLocalStream(newStream);
          
          // Update self in participants
          setParticipants(prev => 
            prev.map(p => 
              p.userId === user?.userId ? { ...p, stream: newStream } : p
            )
          );
        }
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        
        // Add audio from the existing stream if available
        if (localStream) {
          const audioTracks = localStream.getAudioTracks();
          audioTracks.forEach(track => {
            screenStream.addTrack(track);
          });
          
          // Stop the video tracks from the previous stream
          const videoTracks = localStream.getVideoTracks();
          videoTracks.forEach(track => {
            track.stop();
          });
        }
        
        setLocalStream(screenStream);
        
        // Update self in participants
        setParticipants(prev => 
          prev.map(p => 
            p.userId === user?.userId ? { ...p, stream: screenStream } : p
          )
        );
      }
      
      // Call API to update screen sharing status
      await toggleScreenSharing(params.appointmentId);
      setIsScreenSharing(!isScreenSharing);
    } catch (err) {
      console.error('Error toggling screen share:', err);
    }
  };
  
  const handleEndCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    router.push(`/appointments/${params.appointmentId}`);
  };
  
  // If still loading and no appointment, show loading indicator
  if (loading && !appointment) {
    return (
      <AuthLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </AuthLayout>
    );
  }
  
  // If error or no appointment, show error
  if (error || !appointment) {
    return (
      <AuthLayout>
        <div className="p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Error</h2>
              <p className="text-gray-600 mb-8">{error || 'The appointment could not be found or has been cancelled.'}</p>
              {error && error.includes('authentication') && (
                <button 
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg mb-4"
                  onClick={() => {
                    // Clear auth tokens and redirect to login
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    router.push('/auth/login');
                  }}
                >
                  Return to Login
                </button>
              )}
              <button 
                className="bg-primary-600 text-white px-6 py-3 rounded-lg"
                onClick={() => router.push('/appointments')}
              >
                Return to Appointments
              </button>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }
  
  // Show waiting room for patients
  if (isWaiting && !isDoctor) {
    return (
      <AuthLayout>
        <WaitingRoom
          doctorName={appointment.doctorDetails ? `Dr. ${appointment.doctorDetails.firstName} ${appointment.doctorDetails.lastName}` : 'Your Doctor'}
          appointmentTime={appointment.startTime}
          appointmentType={appointment.appointmentType}
          onReady={handleReadyForCall}
          waitingSince={Date.now() - 60000} // 1 minute ago for demo
          isAdmitted={patientAdmitted}
        />
      </AuthLayout>
    );
  }
  
  // Show active call UI
  return (
    <AuthLayout fullWidth>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <header className="bg-white py-2 px-6 shadow-sm">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">
              {isDoctor ? (
                <>Appointment with {appointment.patientName || 'Patient'}</>
              ) : (
                <>Appointment with Dr. {appointment.doctorName || 'Doctor'}</>
              )} - {appointment.appointmentType}
            </h1>
            
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
                Live
              </span>
            </div>
          </div>
        </header>
        
        <main className="flex-1 bg-gray-50 overflow-auto p-4">
          {isCallActive ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              {participants.map((participant) => (
                <div key={participant.userId} className={`${participant.userId === user?.userId ? 'md:order-2' : 'md:order-1'}`}>
                  <ParticipantVideo
                    stream={participant.stream}
                    name={participant.name}
                    isSelf={participant.userId === user?.userId}
                    isSpeaking={participant.isSpeaking}
                    isMuted={participant.isMuted}
                    isCameraOff={participant.isCameraOff}
                    isSmall={false}
                  />
                </div>
              ))}
            </div>
          ) : isDoctor ? (
            <div className="h-full flex items-center justify-center">
              <div className="max-w-lg w-full">
                <DoctorWaitingRoom
                  waitingPatients={waitingPatients}
                  onAdmitPatient={handleAdmitPatient}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-8 rounded-xl shadow-md"
                >
                  <div className="w-20 h-20 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Initializing Call</h2>
                  <p className="text-gray-600 mb-6">Please wait while we set up your video call...</p>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-l-2 border-primary-600"></div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </main>
        
        {isCallActive && (
          <VideoControls
            isMicrophoneOn={isMicrophoneOn}
            isCameraOn={isCameraOn}
            isScreenSharing={isScreenSharing}
            onToggleMicrophone={handleToggleMicrophone}
            onToggleCamera={handleToggleCamera}
            onToggleScreenShare={handleToggleScreenShare}
            onEndCall={handleEndCall}
          />
        )}
      </div>
    </AuthLayout>
  );
} 