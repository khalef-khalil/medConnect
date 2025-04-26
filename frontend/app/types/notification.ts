export type NotificationType = 
  | 'appointment_created' 
  | 'appointment_confirmed' 
  | 'appointment_cancelled' 
  | 'appointment_rejected'
  | 'payment_refunded'
  | 'new_message';

export interface Notification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId: string | null;
  isRead: boolean;
  timestamp: number;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  count: number;
} 