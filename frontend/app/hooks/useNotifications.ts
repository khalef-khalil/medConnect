import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { Notification } from '../types/notification';
import { 
  getUserNotifications, 
  markNotificationsAsRead, 
  markAllNotificationsAsRead 
} from '../lib/api/notificationApi';

export function useNotifications() {
  const { token } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (unreadOnly: boolean = false) => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getUserNotifications(token, unreadOnly);
      setNotifications(data.notifications);
      
      // Count unread notifications
      const unread = data.notifications.filter(n => !n.isRead).length;
      setUnreadCount(unread);
      
      return data.notifications;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch notifications';
      setError(errorMessage);
      console.error('Error fetching notifications:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    if (!token || !notificationIds.length) return false;
    
    try {
      await markNotificationsAsRead(token, notificationIds);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notificationIds.includes(notification.notificationId) 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to mark notifications as read';
      console.error('Error marking notifications as read:', err);
      toast.error(errorMessage);
      return false;
    }
  }, [token]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!token) return false;
    
    try {
      await markAllNotificationsAsRead(token);
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to mark all notifications as read';
      console.error('Error marking all notifications as read:', err);
      toast.error(errorMessage);
      return false;
    }
  }, [token]);

  // Initial fetch
  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };
} 