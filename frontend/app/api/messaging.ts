import { useAuthStore } from '../store/authStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function fetchConversations() {
  const { token } = useAuthStore.getState();
  
  try {
    const response = await fetch(`${API_BASE_URL}/chats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

export async function createConversation(participants: string[], subject: string) {
  const { token } = useAuthStore.getState();
  
  try {
    const response = await fetch(`${API_BASE_URL}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        participants,
        subject,
        e2eeEnabled: true
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

export async function fetchMessages(conversationId: string) {
  const { token } = useAuthStore.getState();
  
  try {
    const response = await fetch(`${API_BASE_URL}/chats/${conversationId}/messages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

export async function sendMessage(conversationId: string, content: string) {
  const { token } = useAuthStore.getState();
  
  try {
    const response = await fetch(`${API_BASE_URL}/chats/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export async function markMessagesAsRead(conversationId: string, messageIds: string[]) {
  const { token } = useAuthStore.getState();
  
  try {
    const response = await fetch(`${API_BASE_URL}/chats/${conversationId}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        messageIds
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark messages as read');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}

export async function getAIResponse(conversationId: string, message: string) {
  const { token } = useAuthStore.getState();
  
  try {
    const response = await fetch(`${API_BASE_URL}/chats/${conversationId}/ai-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting AI response:', error);
    throw error;
  }
} 