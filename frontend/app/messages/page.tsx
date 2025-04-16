'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import AuthLayout from '../components/layout/AuthLayout';
import ConversationsList from '../components/messaging/ConversationsList';
import ConversationView from '../components/messaging/ConversationView';
import { useMessaging } from '../hooks/useMessaging';
import { Conversation } from '../types/messaging';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams.get('conversationId');
  
  const { getConversations, loading, error, conversations } = useMessaging();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    getConversations();
  }, [getConversations]);

  // Handle conversation selection from URL parameter
  useEffect(() => {
    if (conversations.length > 0) {
      if (conversationIdParam) {
        const conversation = conversations.find(c => c.conversationId === conversationIdParam);
        if (conversation) {
          setSelectedConversation(conversation);
          return;
        }
      }
      
      // If no conversation ID in URL or conversation not found, select the first one
      if (!selectedConversation) {
        setSelectedConversation(conversations[0]);
      }
    }
  }, [conversations, conversationIdParam, selectedConversation]);

  return (
    <AuthLayout>
      <div className="p-4 md:p-8 h-full">
        <div className="max-w-7xl mx-auto h-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="h-full"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              Messages
            </h1>
            <p className="text-gray-600 mb-8">
              Communicate securely with your healthcare providers.
            </p>
            
            {loading && conversations.length === 0 ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : error && conversations.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-red-500 mb-4">Failed to load conversations</p>
                <button 
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg"
                  onClick={() => getConversations()}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-280px)] flex">
                <div className="w-1/3 border-r border-gray-200 h-full">
                  <ConversationsList 
                    conversations={conversations}
                    selectedConversation={selectedConversation}
                    onSelectConversation={setSelectedConversation}
                  />
                </div>
                <div className="w-2/3 h-full">
                  {selectedConversation ? (
                    <ConversationView conversation={selectedConversation} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500">Select a conversation to start messaging</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AuthLayout>
  );
} 