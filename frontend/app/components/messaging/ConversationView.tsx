import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAuthStore } from '../../store/authStore';
import { useMessaging } from '../../hooks/useMessaging';
import { Conversation, Message } from '../../types/messaging';
import MessageBubble from './MessageBubble';

interface ConversationViewProps {
  conversation: Conversation;
}

export default function ConversationView({ conversation }: ConversationViewProps) {
  const { user } = useAuthStore();
  const {
    messages,
    loading,
    error,
    getMessages,
    sendNewMessage,
    markAsRead,
    requestAIResponse
  } = useMessaging();
  
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const defaultProfileImage = '/assets/default-avatar.png';

  // Get other participant (not current user)
  const otherParticipant = conversation.participants.find(
    p => p.userId !== user?.userId
  ) || conversation.participants[0];

  useEffect(() => {
    if (conversation) {
      getMessages(conversation.conversationId);
    }
  }, [conversation, getMessages]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Mark unread messages as read
    const unreadMessages = messages
      .filter(m => !m.read && m.senderId !== user?.userId)
      .map(m => m.messageId);
    
    if (unreadMessages.length > 0) {
      markAsRead(conversation.conversationId, unreadMessages);
    }
  }, [messages, conversation.conversationId, markAsRead, user?.userId]);

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim()) return;
    
    try {
      await sendNewMessage(conversation.conversationId, messageText);
      setMessageText('');
      
      // Simulate AI assistant typing
      if (conversation.participants.some(p => p.role === 'doctor')) {
        setIsTyping(true);
        
        // Simulate a delay before AI responds
        setTimeout(async () => {
          await requestAIResponse(conversation.conversationId, messageText);
          setIsTyping(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  // Group messages by date
  const groupedMessages: { [date: string]: Message[] } = {};
  messages.forEach(message => {
    const date = new Date(message.timestamp).toLocaleDateString();
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(message);
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center">
        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-200 mr-3">
          <Image
            src={defaultProfileImage}
            alt={otherParticipant.name}
            className="object-cover"
            fill
            sizes="40px"
          />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {otherParticipant.name}
          </h3>
          <p className="text-xs text-gray-500">{otherParticipant.role}</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">Failed to load messages</p>
            <button 
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm"
              onClick={() => getMessages(conversation.conversationId)}
            >
              Try Again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date} className="mb-6">
                <div className="text-center mb-4">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {formatMessageDate(dateMessages[0].timestamp)}
                  </span>
                </div>
                
                {dateMessages.map((message) => {
                  const isCurrentUser = message.senderId === user?.userId;
                  const isAI = message.isAIGenerated;
                  
                  return (
                    <MessageBubble
                      key={message.messageId}
                      message={message}
                      isCurrentUser={isCurrentUser}
                      isAI={isAI}
                      formatTime={formatMessageTime}
                    />
                  );
                })}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 rounded-lg p-3 rounded-bl-none">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input
            type="text"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-primary-500 focus:border-primary-500"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-r-lg transition-colors"
            disabled={loading || !messageText.trim()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
} 