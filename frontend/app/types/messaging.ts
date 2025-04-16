export interface Participant {
  userId: string;
  name: string;
  role: string;
}

export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  content: string;
  isEncrypted: boolean;
  isAIGenerated?: boolean;
  timestamp: string;
  createdAt: string;
  read: boolean;
  metadata?: {
    intent?: string;
    intentConfidence?: number;
    intentCategory?: "MEDICAL" | "ADMINISTRATIVE" | "GENERAL";
    intentPriority?: "HIGH" | "MEDIUM" | "LOW";
    requiresFollowUp?: boolean;
    parameters?: any;
    hasParameters?: boolean;
  };
}

export interface MessagePreview {
  messageId: string;
  senderId: string;
  content: string;
  timestamp: string;
}

export interface Conversation {
  conversationId: string;
  participants: Participant[];
  subject: string;
  isEncrypted: boolean;
  lastMessage: MessagePreview;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface MessagesResponse {
  messages: Message[];
  count: number;
  isEncrypted: boolean;
}

export interface CreateConversationResponse {
  message: string;
  conversation: Conversation;
}

export interface SendMessageResponse {
  message: string;
  messageDetails: Message;
}

export interface MarkMessagesReadResponse {
  message: string;
  messageIds: string[];
}

export interface AIResponseMessage {
  message: string;
  messageDetails: Message;
} 