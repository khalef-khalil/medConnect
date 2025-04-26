import axios from 'axios';
import { Notification, NotificationsResponse } from '../../types/notification';
import { createAxiosInstance } from './apiUtils';

// Get user notifications
export const getUserNotifications = async (token: string, unreadOnly: boolean = false, limit: number = 20): Promise<NotificationsResponse> => {
  const api = createAxiosInstance(token);
  const response = await api.get(`/notifications?unreadOnly=${unreadOnly}&limit=${limit}`);
  return response.data;
};

// Mark notifications as read
export const markNotificationsAsRead = async (token: string, notificationIds: string[]): Promise<{ message: string }> => {
  const api = createAxiosInstance(token);
  const response = await api.put('/notifications/read', { notificationIds });
  return response.data;
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (token: string): Promise<{ message: string, count: number }> => {
  const api = createAxiosInstance(token);
  const response = await api.put('/notifications/read-all');
  return response.data;
}; 