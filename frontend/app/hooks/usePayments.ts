import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export interface PaymentMethod {
  type: string;
  lastFour: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Payment {
  paymentId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  billingAddress?: BillingAddress;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
  updatedAt: string;
  refundReason?: string;
  refundedAt?: string;
  appointmentDetails?: any;
  userDetails?: any;
}

export interface PaymentFormData {
  appointmentId: string;
  amount: number;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  cardholderName: string;
  billingAddress?: BillingAddress;
}

export function usePayments() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  
  const { authToken } = useAuth();
  const { showToast } = useToast();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  };
  
  // Process a payment for an appointment
  const processPayment = async (paymentData: PaymentFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/payments/process`,
        paymentData,
        config
      );
      
      setCurrentPayment(response.data.payment);
      showToast('Payment processed successfully', 'success');
      setLoading(false);
      return response.data.payment;
    } catch (err: any) {
      console.error('Error processing payment:', err);
      setError(err.response?.data?.message || 'Error processing payment');
      showToast(err.response?.data?.message || 'Error processing payment', 'error');
      setLoading(false);
      return null;
    }
  };
  
  // Get payment history for the user
  const getPaymentHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `${API_URL}/payments/history`,
        config
      );
      
      setPayments(response.data.payments);
      setLoading(false);
      return response.data.payments;
    } catch (err: any) {
      console.error('Error fetching payment history:', err);
      setError(err.response?.data?.message || 'Error fetching payment history');
      showToast(err.response?.data?.message || 'Error fetching payment history', 'error');
      setLoading(false);
      return [];
    }
  };
  
  // Get a specific payment by ID
  const getPaymentById = async (paymentId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `${API_URL}/payments/${paymentId}`,
        config
      );
      
      setCurrentPayment(response.data);
      setLoading(false);
      return response.data;
    } catch (err: any) {
      console.error('Error fetching payment:', err);
      setError(err.response?.data?.message || 'Error fetching payment');
      showToast(err.response?.data?.message || 'Error fetching payment', 'error');
      setLoading(false);
      return null;
    }
  };
  
  // Get payments for a specific appointment
  const getPaymentsByAppointment = async (appointmentId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `${API_URL}/payments/appointment/${appointmentId}`,
        config
      );
      
      setPayments(response.data.payments);
      setLoading(false);
      return response.data.payments;
    } catch (err: any) {
      console.error('Error fetching appointment payments:', err);
      setError(err.response?.data?.message || 'Error fetching appointment payments');
      showToast(err.response?.data?.message || 'Error fetching appointment payments', 'error');
      setLoading(false);
      return [];
    }
  };
  
  return {
    loading,
    error,
    payments,
    currentPayment,
    processPayment,
    getPaymentHistory,
    getPaymentById,
    getPaymentsByAppointment
  };
} 