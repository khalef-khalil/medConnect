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

// Add an interface for the session participant
interface SessionParticipant {
  userId: string;
  role: string;
  status: string;
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
  const hasClickedReadyRef = useRef(false);
  
  // Refs for admission status checking rate limiting
  const checkCountRef = useRef(0);
  const lastCheckTimeRef = useRef(0);
  
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
            // After creating the session, doctor is automatically in the call
            setIsCallActive(true);
            
            // Set doctor as ready for waiting room
            if (created) {
              console.log("Doctor session created successfully, now active in call");
            }
          } else {
            console.log("User is patient, joining waiting room...");
            // If user is a patient and there's no session, they can't join yet
            // We'll show a message that they need to wait for the doctor to start the call
            toast.info("Please wait for the doctor to start the video call session");
            
            // Stop showing loading/checking state and return to appointment page
            setIsCallActive(false);
            setIsWaiting(false);
            router.push(`/appointments/${params.appointmentId}`);
            return;
          }
        } else {
          console.log("Found existing session:", 
            {
              sessionId: existingSession.sessionId,
              status: existingSession.status,
              patientId: existingSession.patientId,
              doctorId: existingSession.doctorId
            });
          
          // If user is a doctor and they're returning to an existing session
          if (isDoctor) {
            console.log("Doctor rejoining existing session");
            setIsCallActive(true);
          } else {
            // If user is a patient, they need to join the waiting room
            console.log("Patient joining existing session");
            
            // Check if there's a waiting room enabled flag in the webrtcConfig
            const waitingRoomEnabled = existingSession.webrtcConfig?.waitingRoomEnabled;
            
            if (waitingRoomEnabled === false) {
              // If waiting room is disabled, patient can directly join call
              console.log("Waiting room is disabled, patient can directly join call");
              setIsCallActive(true);
              setIsWaiting(false);
              setPatientAdmitted(true);
              return;
            }
            
            const joined = await joinWaitingRoom(params.appointmentId);
            if (!joined && error) {
              console.error("Failed to join waiting room:", error);
              if (error.includes('session has expired') || error.includes('Invalid authentication')) {
                // Let the error effect handler deal with this
                return;
              }
              toast.error("Failed to join waiting room. Please try again.");
              setIsCallActive(false);
              setIsWaiting(false);
              router.push(`/appointments/${params.appointmentId}`);
              return;
            }
            setIsWaiting(true);
            
            // Start polling for admission status
            console.log("Patient added to waiting room, polling for admission status");
          }
        }
      } catch (err) {
        console.error("Error initializing video session:", err);
        toast.error("There was an error setting up the video call. Please try again.");
        setIsCallActive(false);
        setIsWaiting(false);
      }
    };
    
    initSession();
  }, [params.appointmentId, appointment, isDoctor, user, createVideoSession, getVideoSession, joinWaitingRoom, error, router]);
  
  // Modify the useEffect that checks for admission status to handle rate limiting
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let errorCount = 0;
    const maxErrors = 3;
    const pollInterval = 3000; // 3 seconds for faster detection
    const maxChecksPerWindow = 3;
    const checkWindow = 30000; // 30 seconds window
    
    const checkAdmissionStatus = async () => {
      if (!isWaiting || patientAdmitted) return;
      
      // Check rate limiting
      const currentTime = Date.now();
      if (currentTime - lastCheckTimeRef.current < checkWindow) {
        // We're within the check window
        if (checkCountRef.current >= maxChecksPerWindow) {
          console.log(`[checkAdmissionStatus] Rate limit reached (${maxChecksPerWindow} checks in ${checkWindow/1000} seconds). Waiting...`);
          // Don't attempt the check, but allow the polling to continue
          return;
        }
      } else {
        // We're outside the window, reset counter
        checkCountRef.current = 0;
        lastCheckTimeRef.current = currentTime;
      }
      
      // Increment the check counter
      checkCountRef.current++;
      
      try {
        // Get the latest session state
        const session = await getVideoSession(params.appointmentId);
        
        if (!session) {
          console.log('No session found during admission check');
          errorCount++;
          
          if (errorCount >= maxErrors) {
            console.warn(`Too many errors checking admission status (${errorCount}), stopping polling`);
            setIsWaiting(false);
            toast.error("Failed to check admission status. Please try again later.");
            router.push(`/appointments/${params.appointmentId}`);
          }
          
          return;
        }
        
        // Reset error count when we successfully fetch a session
        errorCount = 0;
        
        console.log(`Checking admission status for patient: ${user?.userId}`, {
          waitingRoomEnabled: session.webrtcConfig?.waitingRoomEnabled,
          participants: session.participants || []
        });
        
        // First check if waiting room is disabled (patient has been admitted)
        if (session.webrtcConfig && session.webrtcConfig.waitingRoomEnabled === false) {
          console.log('Patient has been admitted (waiting room disabled)!');
          setPatientAdmitted(true);
          
          // Show the admission animation briefly before changing to call view
          setTimeout(() => {
            setIsWaiting(false);
            setIsCallActive(true);
          }, 1000);
          
          return;
        }
        
        // Then check participant status if available
        if (session.participants && Array.isArray(session.participants)) {
          const isAdmitted = session.participants.some(
            (p: SessionParticipant) => p.userId === user?.userId && p.status === 'active'
          );
          
          if (isAdmitted) {
            console.log('Patient has been admitted to the call based on participant status!');
            setPatientAdmitted(true);
            
            // Show the admission animation briefly before changing to call view
            setTimeout(() => {
              setIsWaiting(false);
              setIsCallActive(true);
            }, 1000);
          }
        }
      } catch (err) {
        console.error('Error checking admission status:', err);
        errorCount++;
        
        if (errorCount >= maxErrors) {
          console.warn(`Too many errors checking admission status (${errorCount}), stopping polling`);
          setIsWaiting(false);
          toast.error("Failed to check admission status. Please try again later.");
          router.push(`/appointments/${params.appointmentId}`);
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
  }, [isWaiting, isDoctor, params.appointmentId, getVideoSession, user?.userId, router, patientAdmitted]);
  
  // Update the handleReadyForCall function to handle rate limiting
  const handleReadyForCall = async () => {
    try {
      console.log("Patient is ready for call, joining waiting room...");
      
      // Prevent multiple rapid clicks
      if (hasClickedReadyRef.current) {
        console.log("Already clicked ready, ignoring repeated click");
        return;
      }
      
      hasClickedReadyRef.current = true;
      setTimeout(() => {
        hasClickedReadyRef.current = false;
      }, 3000); // Prevent re-clicks for 3 seconds
      
      // First check if the session exists
      const existingSession = await getVideoSession(params.appointmentId);
      
      if (!existingSession) {
        console.log("No session exists yet, can't join waiting room");
        toast.info("The doctor hasn't started the call yet. Please try again later.");
        return;
      }
      
      // Join waiting room through API
      const waitingRoomResult = await joinWaitingRoom(params.appointmentId);
      
      if (!waitingRoomResult) {
        console.error("Failed to join waiting room");
        toast.error("Failed to join waiting room. Please try again.");
        return;
      }
      
      // Begin polling for admission
      setIsWaiting(true);
      
      // Clear any previously admitted status
      setPatientAdmitted(false);
      
      console.log("Patient joined waiting room successfully");
      toast.success("You've joined the waiting room. Please wait for the doctor to admit you.");
    } catch (error) {
      console.error("Failed to join waiting room:", error);
      toast.error("An error occurred while joining the waiting room. Please try again.");
    } finally {
      // Reset the click state in case of errors
      setTimeout(() => {
        hasClickedReadyRef.current = false;
      }, 1000);
    }
  };
  
  // Update the doctor's session to poll for waiting patients
  useEffect(() => {
    // Only run this for doctors and when call is not active yet
    if (!isDoctor || isCallActive || !appointment) return;
    
    const checkWaitingPatients = async () => {
      try {
        console.log(`[checkWaitingPatients] Checking for waiting patients for appointment ${params.appointmentId}`);
        
        // Get the latest session state
        const session = await getVideoSession(params.appointmentId);
        
        if (!session) {
          console.log('[checkWaitingPatients] No session found');
          return;
        }
        
        // Check if we have waitingRoomStatus in the session
        if (session.waitingRoomStatus) {
          console.log('[checkWaitingPatients] Found waiting room status:', session.waitingRoomStatus);
          
          // Convert waiting room status to array of patients
          const patientIds = Object.keys(session.waitingRoomStatus);
          
          if (patientIds.length > 0) {
            console.log(`[checkWaitingPatients] Found ${patientIds.length} waiting patients`);
            
            // Format the patients for the waiting room component
            const formattedPatients = patientIds.map(patientId => {
              const patientStatus = session.waitingRoomStatus[patientId];
              return {
                userId: patientId,
                firstName: appointment.patientDetails?.firstName || 'Patient',
                lastName: appointment.patientDetails?.lastName || '',
                waitingSince: new Date(patientStatus.joinedAt).getTime()
              };
            });
            
            // Update waiting patients state
            setWaitingPatients(formattedPatients);
          }
        } else {
          console.log('[checkWaitingPatients] No waiting room status found in session');
        }
      } catch (err) {
        console.error('[checkWaitingPatients] Error checking for waiting patients:', err);
      }
    };
    
    // Call immediately
    checkWaitingPatients();
    
    // Then poll every 5 seconds
    const interval = setInterval(checkWaitingPatients, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, [isDoctor, isCallActive, appointment, params.appointmentId, getVideoSession]);
  
  // Also modify the handleAdmitPatient function to handle case when waitingPatients is empty
  const handleAdmitPatient = async (patientId: string) => {
    try {
      console.log(`[handleAdmitPatient] Doctor (${user?.userId}) admitting patient (${patientId})`);
      console.log(`[handleAdmitPatient] Appointment ID: ${params.appointmentId}`);
      
      // Show admission in progress
      toast.info("Admitting patient to the call...");
      
      // Dismiss the waiting notification toast if it exists
      toast.dismiss("patient-waiting-notification");
      
      // Refresh appointment data to ensure we have the latest
      await fetchAppointmentById(params.appointmentId);
      
      // Verify we have the appointment data loaded
      if (!appointment) {
        console.error(`[handleAdmitPatient] Appointment data not loaded for ID: ${params.appointmentId}`);
        toast.error("Appointment data not available. Please refresh the page.");
        return;
      }
      
      // If waitingPatients is empty but we have appointment data,
      // use the patient ID from the appointment
      if (waitingPatients.length === 0) {
        console.log(`[handleAdmitPatient] No waiting patients in list, using appointment's patient ID: ${appointment.patientId}`);
        patientId = appointment.patientId;
      } else {
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
  
  // Add a prominent notification when patients are waiting
  useEffect(() => {
    // Only show for doctors and when there are waiting patients
    if (isDoctor && waitingPatients.length > 0) {
      // Show a prominent sticky notification at the top of the screen
      toast.info(
        <div className="flex items-center">
          <div className="mr-3 bg-red-100 p-2 rounded-full">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </div>
          </div>
          <div>
            <p className="font-bold">Patient Waiting to Join!</p>
            <p className="text-sm">
              {waitingPatients[0]?.firstName} {waitingPatients[0]?.lastName} is waiting to join your call
            </p>
          </div>
        </div>, 
        {
          position: "top-right",
          autoClose: false,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          toastId: "patient-waiting-notification" // Prevent duplicate toasts
        }
      );
    }
  }, [isDoctor, waitingPatients]);
  
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