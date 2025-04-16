import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  fetchConversations, 
  createConversation, 
  fetchMessages, 
  sendMessage, 
  markMessagesAsRead, 
  getAIResponse 
} from '../api/messaging';
import { 
  Conversation, 
  Message, 
  ConversationsResponse, 
  MessagesResponse, 
  CreateConversationResponse, 
  SendMessageResponse 
} from '../types/messaging';

export function useMessaging() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response: ConversationsResponse = await fetchConversations();
      setConversations(response.conversations);
      return response.conversations;
    } catch (err) {
      setError('Failed to fetch conversations');
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const startConversation = useCallback(async (participantId: string, subject: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response: CreateConversationResponse = await createConversation([participantId], subject);
      setConversations(prev => [...prev, response.conversation]);
      setCurrentConversation(response.conversation);
      return response.conversation;
    } catch (err) {
      setError('Failed to create conversation');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response: MessagesResponse = await fetchMessages(conversationId);
      setMessages(response.messages);
      return response.messages;
    } catch (err) {
      setError('Failed to fetch messages');
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const sendNewMessage = useCallback(async (conversationId: string, content: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response: SendMessageResponse = await sendMessage(conversationId, content);
      setMessages(prev => [...prev, response.messageDetails]);
      return response.messageDetails;
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (conversationId: string, messageIds: string[]) => {
    try {
      await markMessagesAsRead(conversationId, messageIds);
      setMessages(prev => 
        prev.map(message => 
          messageIds.includes(message.messageId) 
            ? { ...message, read: true } 
            : message
        )
      );
    } catch (err) {
      console.error('Failed to mark messages as read', err);
    }
  }, []);

  const requestAIResponse = useCallback(async (conversationId: string, message: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getAIResponse(conversationId, message);
      setMessages(prev => [...prev, response.messageDetails]);
      return response.messageDetails;
    } catch (err) {
      setError('Failed to get AI response');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    loading,
    error,
    getConversations,
    startConversation,
    getMessages,
    sendNewMessage,
    markAsRead,
    requestAIResponse
  };
} 