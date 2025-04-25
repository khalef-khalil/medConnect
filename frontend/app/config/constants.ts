import { getApiUrl } from '../lib/networkUtils';

// API URL for all requests
export const API_URL = getApiUrl();

// Default currency
export const DEFAULT_CURRENCY = 'USD';

// Payment-related constants
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  FAILED: 'failed'
};

// Appointment-related constants
export const APPOINTMENT_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
}; 