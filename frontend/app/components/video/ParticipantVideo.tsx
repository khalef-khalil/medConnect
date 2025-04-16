'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ParticipantVideoProps {
  stream: MediaStream | null;
  name: string;
  isSelf?: boolean;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isSmall?: boolean;
}

export default function ParticipantVideo({
  stream,
  name,
  isSelf = false,
  isSpeaking = false,
  isMuted = false,
  isCameraOff = false,
  isSmall = false,
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState<boolean>(false);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      try {
        videoRef.current.srcObject = stream;
        // Reset error state if stream attaches successfully
        setVideoError(false);
      } catch (err) {
        console.error('Error attaching stream to video element:', err);
        setVideoError(true);
      }
    } else if (!stream) {
      // If no stream is provided, mark as having video error
      setVideoError(true);
    }
  }, [stream]);
  
  // Determine if we should show the video element or the avatar placeholder
  const shouldShowAvatar = isCameraOff || videoError || !stream;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative rounded-xl overflow-hidden ${
        isSmall
          ? 'w-72 h-40 shadow-md'
          : 'w-full h-full max-h-[80vh] shadow-lg'
      } ${isSpeaking ? 'ring-4 ring-primary-500' : ''}`}
    >
      {shouldShowAvatar ? (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-2">
            <span className="text-2xl text-gray-300 font-medium">
              {name.split(' ').map((n) => n[0]).join('').toUpperCase()}
            </span>
          </div>
          <span className="text-gray-300">{name}</span>
          {videoError && !isCameraOff && (
            <span className="text-xs text-red-400 mt-2">
              {isSelf ? 'Camera not available' : 'Waiting for video'}
            </span>
          )}
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className="w-full h-full object-cover bg-black"
          onError={() => setVideoError(true)}
        />
      )}
      
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">
            {name} {isSelf && '(You)'}
          </span>
          {isMuted && (
            <div className="bg-red-600 p-1 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" strokeDasharray="2 2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
} 