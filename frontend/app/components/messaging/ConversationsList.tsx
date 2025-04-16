import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Conversation } from '../../types/messaging';
import { useAuthStore } from '../../store/authStore';
import Image from 'next/image';

interface ConversationsListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
}

export default function ConversationsList({ 
  conversations, 
  selectedConversation, 
  onSelectConversation 
}: ConversationsListProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const defaultProfileImage = '/assets/default-avatar.png';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If same day, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If within last week, show day name
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    
    if (date > oneWeekAgo) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Get other participant (not current user)
  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p.userId !== user?.userId) || conversation.participants[0];
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
            placeholder="Search conversations..."
          />
        </div>
        <button
          className="w-full mt-3 bg-primary-50 hover:bg-primary-100 text-primary-600 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
          onClick={() => router.push('/messages/new')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Conversation
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500 mb-4">No conversations yet</p>
            <button
              className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              onClick={() => router.push('/doctors')}
            >
              Find a Doctor
            </button>
          </div>
        ) : (
          <ul>
            {conversations.map((conversation) => {
              const isSelected = selectedConversation?.conversationId === conversation.conversationId;
              const otherParticipant = getOtherParticipant(conversation);
              
              return (
                <li
                  key={conversation.conversationId}
                  className={`border-b border-gray-100 cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectConversation(conversation)}
                >
                  <div className="p-4">
                    <div className="flex items-center mb-2">
                      <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-200 mr-3">
                        <Image
                          src={defaultProfileImage}
                          alt={otherParticipant.name}
                          className="object-cover"
                          fill
                          sizes="40px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {otherParticipant.name}
                          </h3>
                          {conversation.lastMessage && (
                            <span className="text-xs text-gray-500">
                              {formatDate(conversation.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{otherParticipant.role}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 font-medium mb-1 truncate">
                        {conversation.subject}
                      </p>
                      {conversation.lastMessage && (
                        <p className="text-xs text-gray-500 truncate">
                          {conversation.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
} 