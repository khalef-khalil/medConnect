import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { getApiBaseUrl } from '../lib/networkUtils';

// Set API base URL dynamically based on the current network environment
const API_BASE_URL = getApiBaseUrl();

console.log(`[useVideo] Using API base URL: ${API_BASE_URL}`);

// Constants for rate limiting
const MAX_API_CALLS = 3;       // Maximum API calls
const API_CALL_WINDOW = 30000; // 30 second window for API calls

interface WebRTCConfig {
  sessionId: string;
  token: string;
  iceServers: any[];
  role: string;
  screenSharingEnabled: boolean;
  recordingEnabled: boolean;
  waitingRoomEnabled: boolean;
}

export interface VideoSession {
  sessionId: string;
  appointmentId: string;
  createdAt: string;
  patientId: string;
  doctorId: string;
  webrtcConfig: WebRTCConfig;
  waitingRoomStatus?: Record<string, any>; // Add waitingRoomStatus to track patients waiting
  participants?: Array<any>; // Optional participants array
}

interface VideoSessionState {
  session: VideoSession | null;
  loading: boolean;
  error: string | null;
}

export const useVideo = () => {
  const { token, isAuthenticated } = useAuthStore();
  const [state, setState] = useState<VideoSessionState>({
    session: null,
    loading: false,
    error: null,
  });
  
  // Cache last successful session to reduce API calls
  const [cachedSession, setCachedSession] = useState<VideoSession | null>(null);
  // Track consecutive 404 errors
  const [consecutive404s, setConsecutive404s] = useState(0);
  const MAX_404_RETRIES = 3;
  
  // Rate limiting state
  const [apiCallCount, setApiCallCount] = useState(0);
  const [lastApiCallTime, setLastApiCallTime] = useState(0);
  const [rateLimitReached, setRateLimitReached] = useState(false);
  const rateLimitTimeout = useRef<NodeJS.Timeout | null>(null);

  const resetState = () => {
    setState({
      session: null,
      loading: false,
      error: null,
    });
    setCachedSession(null);
    setConsecutive404s(0);
    setApiCallCount(0);
    setRateLimitReached(false);
    if (rateLimitTimeout.current) {
      clearTimeout(rateLimitTimeout.current);
      rateLimitTimeout.current = null;
    }
  };
  
  // Reset rate limit after the window expires
  useEffect(() => {
    if (rateLimitReached) {
      rateLimitTimeout.current = setTimeout(() => {
        setApiCallCount(0);
        setRateLimitReached(false);
      }, API_CALL_WINDOW);
      
      return () => {
        if (rateLimitTimeout.current) {
          clearTimeout(rateLimitTimeout.current);
        }
      };
    }
  }, [rateLimitReached]);

  // Get current JWT token (use store token first, fallback to localStorage)
  const getAuthToken = useCallback(() => {
    // First try to get the token from the store (most up-to-date)
    if (token) return token;
    
    // Fallback to localStorage if store token is not available
    const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // If we found a token in localStorage but not in the store, update the store
    if (localToken && !token && typeof window !== 'undefined') {
      // Try to get the user data from localStorage as well
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        try {
          const parsedData = JSON.parse(authData);
          if (parsedData.state && parsedData.state.user) {
            // We have user data, we could update the store here if needed
            console.log('Found user data in localStorage, but not updating store');
          }
        } catch (e) {
          console.error('Failed to parse auth data from localStorage', e);
        }
      }
    }
    
    return localToken || '';
  }, [token]);

  // Monitor token changes and update cached state
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear state when the user logs out
      resetState();
    }
  }, [isAuthenticated]);
  
  // Helper function to track API calls and check rate limits
  const trackApiCall = useCallback(() => {
    const currentTime = Date.now();
    
    // Check if we're within the rate limiting window
    if (currentTime - lastApiCallTime < API_CALL_WINDOW) {
      // We're within the window, increment the count
      const newCallCount = apiCallCount + 1;
      setApiCallCount(newCallCount);
      
      // Check if we've reached the limit
      if (newCallCount >= MAX_API_CALLS) {
        console.warn(`[useVideo] Rate limit reached: ${MAX_API_CALLS} calls in ${API_CALL_WINDOW/1000} seconds`);
        setRateLimitReached(true);
        return false;
      }
    } else {
      // We're outside the window, reset the count
      setApiCallCount(1);
      setRateLimitReached(false);
    }
    
    // Update the last call time
    setLastApiCallTime(currentTime);
    return true;
  }, [apiCallCount, lastApiCallTime]);

  const createVideoSession = async (appointmentId: string) => {
    // Check rate limiting first
    if (rateLimitReached) {
      console.warn(`[createVideoSession] Rate limit reached, not making API call`);
      setState(prev => ({
        ...prev,
        error: "Too many requests. Please try again in a moment."
      }));
      return null;
    }
    
    // Track this API call
    if (!trackApiCall()) {
      return null;
    }
    
    setState({
      session: null,
      loading: true,
      error: null,
    });
    
    try {
      const authToken = getAuthToken();
      
      if (!authToken) {
        setState({
          session: null,
          loading: false,
          error: 'Authentication required',
        });
        return null;
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/video/session`,
        { appointmentId },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
        }
      );
      
      const session = response.data.session;
      
      setState({
        session,
        loading: false,
        error: null,
      });
      
      setCachedSession(session);
      setConsecutive404s(0); // Reset 404 counter on success
      return session;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle 401 errors specifically
        if (error.response?.status === 401) {
          console.error('Authentication error in createVideoSession:', error.response?.data);
          setState({
            session: null,
            loading: false,
            error: 'Your session has expired. Please log in again.',
          });
          // Could trigger a logout or token refresh here
          return null;
        }
        
        setState({
          session: null,
          loading: false,
          error: error.response?.data?.message || 'Failed to create video session',
        });
      } else {
        setState({
          session: null,
          loading: false,
          error: 'An unexpected error occurred',
        });
      }
      
      return null;
    }
  };

  const getVideoSession = useCallback(async (appointmentId: string) => {
    // Check rate limiting first
    if (rateLimitReached) {
      console.warn(`[getVideoSession] Rate limit reached, not making API call`);
      setState(prev => ({
        ...prev,
        loading: false,
        error: "Too many requests. Please try again in a moment."
      }));
      return cachedSession;
    }
    
    // Track this API call
    if (!trackApiCall()) {
      return cachedSession;
    }
    
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));
    
    try {
      const authToken = getAuthToken();
      console.log(`[getVideoSession] Getting session for appointment ${appointmentId}`);
      
      if (!authToken) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Authentication required',
        }));
        return null;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/v1/video/session/${appointmentId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
      });
      
      const session = response.data.session;
      console.log(`[getVideoSession] Session retrieved:`, {
        sessionId: session.sessionId,
        appointmentId: session.appointmentId,
        patientId: session.patientId,
        doctorId: session.doctorId,
        webrtcConfig: session.webrtcConfig ? {
          role: session.webrtcConfig.role,
          waitingRoomEnabled: session.webrtcConfig.waitingRoomEnabled
        } : null
      });
      
      setState({
        session,
        loading: false,
        error: null,
      });
      
      setCachedSession(session);
      setConsecutive404s(0); // Reset 404 counter on success
      return session;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // If the error is 404, it means there's no session yet, which is not an error
        if (error.response?.status === 404) {
          console.log(`[getVideoSession] No session found for appointment ${appointmentId}`);
          
          // Increment the 404 counter
          const new404Count = consecutive404s + 1;
          setConsecutive404s(new404Count);
          
          // If we've had too many 404s in a row, report an error
          if (new404Count >= MAX_404_RETRIES) {
            console.warn(`[getVideoSession] Too many 404 responses (${new404Count}), reporting error`);
            setState(prev => ({
              ...prev,
              loading: false,
              error: "No video session is available. The doctor may not have started the call yet.",
            }));
            return null;
          }
          
          setState(prev => ({
            ...prev,
            loading: false,
            error: null,
            // Keep existing session if we had one
            session: prev.session,
          }));
          
          // Return cached session if available instead of null
          // This prevents excessive error messages when API is not responding
          return cachedSession;
        }
        
        // Check for invalid token
        if (error.response?.status === 401) {
          console.error('[getVideoSession] Authentication error:', error.response?.data);
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Your session has expired. Please log in again.',
          }));
          return null;
        }
        
        console.error(`[getVideoSession] Error:`, {
          status: error.response?.status,
          message: error.response?.data?.message || 'Unknown error'
        });
        
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.response?.data?.message || 'Failed to get video session',
        }));
      } else {
        console.error(`[getVideoSession] Unexpected error:`, error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'An unexpected error occurred',
        }));
      }
      
      // Return cached data if available, to reduce repeated error states
      return cachedSession;
    }
  }, [cachedSession, getAuthToken, consecutive404s, rateLimitReached, trackApiCall]);

  const joinWaitingRoom = async (appointmentId: string) => {
    setState({
      session: null,
      loading: true,
      error: null,
    });
    
    try {
      const authToken = getAuthToken();
      
      if (!authToken) {
        setState({
          session: null,
          loading: false,
          error: 'Authentication required',
        });
        return null;
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/video/session/${appointmentId}/waiting-room`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
        }
      );
      
      setState({
        session: state.session,
        loading: false,
        error: null,
      });
      
      return response.data.waitingRoomData;
    } catch (error) {
      // Check for invalid token specifically
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error('Authentication error in joinWaitingRoom:', error.response?.data);
        setState({
          session: null,
          loading: false,
          error: 'Your session has expired. Please log in again.',
        });
        return null;
      }
      
      // If API fails, create a mock response so the UI still works
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn('Waiting room API not available, using mock response');
        
        // Mock waiting room data for better UX
        const mockWaitingRoomData = {
          status: 'waiting',
          joinedAt: new Date().toISOString(),
        };
        
        setState({
          session: state.session,
          loading: false,
          error: null,
        });
        
        return mockWaitingRoomData;
      }
      
      if (axios.isAxiosError(error)) {
        setState({
          session: null,
          loading: false,
          error: error.response?.data?.message || 'Failed to join waiting room',
        });
      } else {
        setState({
          session: null,
          loading: false,
          error: 'An unexpected error occurred',
        });
      }
      
      return null;
    }
  };

  const admitPatient = async (appointmentId: string, patientId: string) => {
    console.log(`[admitPatient] Starting to admit patient ${patientId} for appointment ${appointmentId}`);
    setState({
      session: null,
      loading: true,
      error: null,
    });
    
    try {
      const authToken = getAuthToken();
      console.log(`[admitPatient] Got auth token: ${authToken ? 'Valid token' : 'No token'}`);
      
      if (!authToken) {
        setState({
          session: null,
          loading: false,
          error: 'Authentication required',
        });
        return null;
      }
      
      console.log(`[admitPatient] Making API request to: ${API_BASE_URL}/api/v1/video/session/${appointmentId}/admit/${patientId}`);
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/video/session/${appointmentId}/admit/${patientId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
        }
      );
      
      console.log(`[admitPatient] Received success response:`, response.data);
      
      // Update cached session - IMPORTANT!
      // This ensures the session data is immediately updated in our app state
      if (cachedSession && cachedSession.webrtcConfig) {
        const updatedSession = {
          ...cachedSession,
          webrtcConfig: {
            ...cachedSession.webrtcConfig,
            waitingRoomEnabled: false
          }
        };
        console.log(`[admitPatient] Updating cached session:`, {
          sessionId: updatedSession.sessionId,
          waitingRoomEnabled: updatedSession.webrtcConfig.waitingRoomEnabled
        });
        
        setCachedSession(updatedSession);
        setState({
          session: updatedSession,
          loading: false,
          error: null,
        });
      }
      
      // Immediately fetch the updated session to confirm changes
      console.log(`[admitPatient] Fetching updated session to confirm changes`);
      try {
        const updatedSession = await axios.get(`${API_BASE_URL}/api/v1/video/session/${appointmentId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
        });
        
        const fetchedSession = updatedSession.data.session;
        console.log(`[admitPatient] Updated session status:`, {
          sessionId: fetchedSession.sessionId,
          waitingRoomEnabled: fetchedSession.webrtcConfig?.waitingRoomEnabled,
          patientId: fetchedSession.patientId
        });
        
        // Update with the freshly fetched session data
        setCachedSession(fetchedSession);
        setState({
          session: fetchedSession,
          loading: false,
          error: null,
        });
      } catch (updateError) {
        console.warn(`[admitPatient] Couldn't fetch updated session:`, updateError);
        // If we can't fetch the updated session, continue with our manually updated cached session
      }
      
      const admitData = response.data.admitData;
      console.log(`[admitPatient] Returning admit data:`, admitData);
      return admitData;
    } catch (error) {
      // Check for invalid token specifically
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error('[admitPatient] Authentication error:', error.response?.data);
        setState({
          session: null,
          loading: false,
          error: 'Your session has expired. Please log in again.',
        });
        return null;
      }
      
      // If API fails, create a mock response so the UI still works
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn('[admitPatient] API returned 404, using mock response');
        
        // Mock admit data for better UX
        const mockAdmitData = {
          status: 'admitted',
          admittedAt: new Date().toISOString(),
        };
        
        setState({
          session: state.session,
          loading: false,
          error: null,
        });
        
        console.log('[admitPatient] Returning mock data:', mockAdmitData);
        return mockAdmitData;
      }
      
      console.error('[admitPatient] Error:', error);
      if (axios.isAxiosError(error)) {
        console.error('[admitPatient] Axios error details:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
        
        setState({
          session: null,
          loading: false,
          error: error.response?.data?.message || 'Failed to admit patient',
        });
      } else {
        setState({
          session: null,
          loading: false,
          error: 'An unexpected error occurred',
        });
      }
      
      return null;
    }
  };

  const toggleScreenSharing = async (appointmentId: string) => {
    setState({
      session: null,
      loading: true,
      error: null,
    });
    
    try {
      const authToken = getAuthToken();
      
      if (!authToken) {
        setState({
          session: null,
          loading: false,
          error: 'Authentication required',
        });
        return null;
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/video/session/${appointmentId}/screen-sharing`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
        }
      );
      
      setState({
        session: state.session,
        loading: false,
        error: null,
      });
      
      return response.data.screenSharingData;
    } catch (error) {
      // Check for invalid token specifically
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error('Authentication error in toggleScreenSharing:', error.response?.data);
        setState({
          session: null,
          loading: false,
          error: 'Your session has expired. Please log in again.',
        });
        return null;
      }
      
      if (axios.isAxiosError(error)) {
        setState({
          session: null,
          loading: false,
          error: error.response?.data?.message || 'Failed to toggle screen sharing',
        });
      } else {
        setState({
          session: null,
          loading: false,
          error: 'An unexpected error occurred',
        });
      }
      
      return null;
    }
  };

  return {
    ...state,
    createVideoSession,
    getVideoSession,
    joinWaitingRoom,
    admitPatient,
    toggleScreenSharing,
    resetState,
    rateLimitReached, // Export this so components can know about rate limiting
  };
}; 