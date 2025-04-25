'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import AuthLayout from '../components/layout/AuthLayout';
import io, { Socket } from 'socket.io-client';
import { motion } from 'framer-motion';

// Define types
interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: number;
  isRead: boolean;
}

interface Conversation {
  conversationId: string;
  participantId: string;
  participantName: string;
  profileImage?: string;
  specialization?: string;
  role: string;
  lastMessage?: Message;
  unreadCount: number;
}

export default function MessagesPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlConversationId = searchParams.get('conversationId');
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Create a ref for the messages container to enable auto-scrolling
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Function to scroll to the bottom of the messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to WebSocket
  useEffect(() => {
    if (!user || !token) return;

    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      auth: { token }
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socketInstance.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user, token]);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user || !token) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/messages/conversations`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setConversations(data.conversations);
          
          // Select conversation from URL if provided and exists in the list
          if (urlConversationId && data.conversations) {
            const conversationExists = data.conversations.some(
              (conv: Conversation) => conv.conversationId === urlConversationId
            );
            
            if (conversationExists) {
              setSelectedConversation(urlConversationId);
            } else if (data.conversations.length > 0) {
              // If URL conversation doesn't exist, select first one
              setSelectedConversation(data.conversations[0].conversationId);
            }
          } else if (data.conversations && data.conversations.length > 0 && !selectedConversation) {
            // If no URL param and no selection yet, select first conversation
            setSelectedConversation(data.conversations[0].conversationId);
          }
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, token, urlConversationId]);

  // Join conversations via WebSocket
  useEffect(() => {
    if (!socket || !conversations.length) return;

    const conversationIds = conversations.map(conv => conv.conversationId);
    socket.emit('join-conversations', conversationIds);

    // Listen for new messages
    socket.on('new-message', (message: Message) => {
      // If it's for the currently selected conversation, add it to messages
      if (message.conversationId === selectedConversation) {
        setMessages(prev => [...prev, message]);
        
        // Mark as read if we received it
        if (message.recipientId === user?.userId) {
          socket.emit('mark-read', { 
            messageIds: [message.messageId],
            conversationId: message.conversationId
          });
        }
      }
      
      // Update the conversation list to show latest message
      setConversations(prev => {
        return prev.map(conv => {
          if (conv.conversationId === message.conversationId) {
            return {
              ...conv,
              lastMessage: message,
              unreadCount: message.recipientId === user?.userId && !message.isRead 
                ? conv.unreadCount + 1 
                : conv.unreadCount
            };
          }
          return conv;
        });
      });
    });

    // Listen for read status updates
    socket.on('messages-read', ({ messageIds, readBy }) => {
      if (readBy !== user?.userId) {
        setMessages(prev => {
          return prev.map(msg => {
            if (messageIds.includes(msg.messageId)) {
              return { ...msg, isRead: true };
            }
            return msg;
          });
        });
      }
    });

    return () => {
      socket.off('new-message');
      socket.off('messages-read');
    };
  }, [socket, conversations, selectedConversation, user?.userId]);

  // Fetch messages when a conversation is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation || !token) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/messages/conversations/${selectedConversation}`, 
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages);
          
          // Mark unread messages as read
          const unreadMessages = data.messages.filter(
            (msg: Message) => !msg.isRead && msg.recipientId === user?.userId
          );
          
          if (unreadMessages.length > 0 && socket) {
            const messageIds = unreadMessages.map((msg: Message) => msg.messageId);
            socket.emit('mark-read', { 
              messageIds,
              conversationId: selectedConversation
            });
            
            // Update unread count in conversations list
            setConversations(prev => {
              return prev.map(conv => {
                if (conv.conversationId === selectedConversation) {
                  return { ...conv, unreadCount: 0 };
                }
                return conv;
              });
            });
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [selectedConversation, token, user?.userId, socket]);

  // Handle sending message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !socket || !user) return;

    // Get recipient from the selected conversation
    const conversation = conversations.find(c => c.conversationId === selectedConversation);
    if (!conversation) return;

    // Set loading state
    setSendingMessage(true);

    // Send message via WebSocket
    socket.emit('send-message', {
      conversationId: selectedConversation,
      content: newMessage,
      recipientId: conversation.participantId
    });

    // Clear input
    setNewMessage('');
    
    // Reset sending state after a short delay (the message should appear in the conversation when the server emits it back)
    setTimeout(() => {
      setSendingMessage(false);
    }, 1000);
  };

  // Format date
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for conversation list
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <AuthLayout>
      <div className="flex h-screen overflow-hidden">
        {/* Conversation list */}
        <div className="w-1/4 border-r border-gray-200 h-full overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Messages</h2>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conversation) => (
              <div
                key={conversation.conversationId}
                className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                  selectedConversation === conversation.conversationId ? 'bg-primary-50' : ''
                }`}
                onClick={() => setSelectedConversation(conversation.conversationId)}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-300 mr-3 flex items-center justify-center overflow-hidden">
                    {conversation.profileImage ? (
                      <img src={conversation.profileImage} alt={conversation.participantName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-semibold text-gray-600">
                        {conversation.participantName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{conversation.participantName}</h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatDate(conversation.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500 truncate w-32">
                        {conversation.lastMessage ? conversation.lastMessage.content : 'No messages yet'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-1">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No conversations yet. You can message doctors you've had appointments with.
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 flex flex-col h-full">
          {selectedConversation ? (
            <>
              {/* Conversation header */}
              <div className="p-4 border-b border-gray-200">
                {conversations.find(c => c.conversationId === selectedConversation) && (
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-300 mr-3 flex items-center justify-center overflow-hidden">
                      {conversations.find(c => c.conversationId === selectedConversation)?.profileImage ? (
                        <img 
                          src={conversations.find(c => c.conversationId === selectedConversation)?.profileImage} 
                          alt={conversations.find(c => c.conversationId === selectedConversation)?.participantName} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span className="text-lg font-semibold text-gray-600">
                          {conversations.find(c => c.conversationId === selectedConversation)?.participantName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {conversations.find(c => c.conversationId === selectedConversation)?.participantName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {conversations.find(c => c.conversationId === selectedConversation)?.specialization || 
                          (conversations.find(c => c.conversationId === selectedConversation)?.role === 'doctor' ? 'Doctor' : 'Patient')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto">
                {messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.messageId}
                        className={`flex ${message.senderId === user.userId ? 'justify-end' : 'justify-start'}`}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.senderId === user.userId
                              ? 'bg-primary-100 text-primary-900'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p>{message.content}</p>
                          <div className="text-xs mt-1 flex justify-end items-center">
                            <span className={message.senderId === user.userId ? 'text-primary-700' : 'text-gray-500'}>
                              {formatTime(message.timestamp)}
                            </span>
                            {message.senderId === user.userId && (
                              <span className="ml-1">
                                {message.isRead ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-700" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    ))}
                    {/* This div is used for auto-scrolling */}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="text-center">
                      <p className="text-gray-500 mb-4">No messages yet. Start the conversation!</p>
                      <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                        <h3 className="text-lg font-medium text-primary-600 mb-3">Send your first message</h3>
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="firstMessage" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <textarea
                              id="firstMessage"
                              rows={3}
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Type your message here..."
                              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg disabled:opacity-50 hover:bg-primary-700 transition-colors"
                          >
                            Send Message
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Message input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={sendingMessage}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
                    aria-label="Send message"
                  >
                    {sendingMessage ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-1 px-2">
                  Press Enter to send, Shift+Enter for a new line
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Your Messages</h3>
                <p className="text-gray-500 mb-4">
                  Select a conversation to view and send messages.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
} 