import React from 'react';
import { Message } from '../../types/messaging';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  isAI?: boolean;
  formatTime: (timestamp: string) => string;
}

export default function MessageBubble({ message, isCurrentUser, isAI, formatTime }: MessageBubbleProps) {
  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isCurrentUser
            ? 'bg-primary-600 text-white rounded-br-none'
            : isAI
            ? 'bg-green-100 text-gray-800 rounded-bl-none'
            : 'bg-white text-gray-800 rounded-bl-none'
        }`}
      >
        <p className="text-sm">{message.content}</p>
        <div className={`text-xs mt-1 flex items-center ${isCurrentUser ? 'text-primary-100' : 'text-gray-500'}`}>
          {formatTime(message.timestamp)}
          
          {isCurrentUser && (
            <span className="ml-2">
              {message.read ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              )}
            </span>
          )}
          
          {isAI && message.metadata?.intentPriority && (
            <span 
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                message.metadata.intentPriority === 'HIGH' 
                  ? 'bg-red-100 text-red-600' 
                  : message.metadata.intentPriority === 'MEDIUM'
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-blue-100 text-blue-600'
              }`}
            >
              {message.metadata.intentPriority}
            </span>
          )}
        </div>
        
        {isAI && message.metadata?.intentCategory && (
          <div className="mt-1 text-xs bg-gray-50 px-2 py-1 rounded text-gray-500">
            {message.metadata.intentCategory}
          </div>
        )}
      </div>
    </div>
  );
} 