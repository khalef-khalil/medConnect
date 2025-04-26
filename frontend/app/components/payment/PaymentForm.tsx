import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePayments } from '../../hooks/usePayments';

interface PaymentFormProps {
  appointmentId: string;
  amount: number;
  onSuccess: () => void;
}

export default function PaymentForm({ appointmentId, amount, onSuccess }: PaymentFormProps) {
  const { processPayment, loading, error } = usePayments();
  
  // Form state
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [cardholderName, setCardholderName] = useState<string>('');
  
  // Billing address state
  const [billingAddress, setBillingAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US'
  });
  
  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };
  
  // Format expiry date
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (v.length >= 3) {
      return `${v.substring(0, 2)}/${v.substring(2)}`;
    }
    
    return value;
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cardNumber') {
      setCardNumber(formatCardNumber(value));
    } else if (name === 'cardExpiry') {
      setCardExpiry(formatExpiry(value));
    } else if (name === 'cardCvc') {
      setCardCvc(value.replace(/[^0-9]/g, '').slice(0, 3));
    } else if (name === 'cardholderName') {
      setCardholderName(value);
    } else if (name.startsWith('billing')) {
      const billingField = name.replace('billing', '').toLowerCase();
      
      setBillingAddress(prev => ({
        ...prev,
        [billingField === 'line1' ? 'line1' : 
          billingField === 'line2' ? 'line2' : 
          billingField === 'postalcode' ? 'postalCode' : billingField]: value
      }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!cardNumber || !cardExpiry || !cardCvc || !cardholderName) {
      return;
    }
    
    // Remove spaces from card number and format expiry
    const cleanedCardNumber = cardNumber.replace(/\s+/g, '');
    
    // Process payment
    const paymentData = {
      appointmentId: appointmentId,
      amount: amount,
      currency: 'TND',
      cardNumber: cleanedCardNumber,
      cardExpiry,
      cardCvc,
      cardholderName,
      billingAddress
    };
    
    const result = await processPayment(paymentData);
    
    if (result) {
      onSuccess();
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm p-6"
    >
      <h2 className="text-xl font-bold mb-6">Payment Details</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-1">
            Cardholder Name
          </label>
          <input
            type="text"
            id="cardholderName"
            name="cardholderName"
            value={cardholderName}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            placeholder="John Smith"
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Card Number
          </label>
          <div className="relative">
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              value={cardNumber}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              required
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 116 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="cardExpiry" className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="text"
              id="cardExpiry"
              name="cardExpiry"
              value={cardExpiry}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="MM/YY"
              maxLength={5}
              required
            />
          </div>
          <div>
            <label htmlFor="cardCvc" className="block text-sm font-medium text-gray-700 mb-1">
              CVC
            </label>
            <input
              type="text"
              id="cardCvc"
              name="cardCvc"
              value={cardCvc}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="123"
              maxLength={3}
              required
            />
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Billing Address</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="billingLine1" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                id="billingLine1"
                name="billingLine1"
                value={billingAddress.line1}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="123 Main St"
                required
              />
            </div>
            
            <div>
              <label htmlFor="billingLine2" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                id="billingLine2"
                name="billingLine2"
                value={billingAddress.line2}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="Apt 4B"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="billingCity" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="billingCity"
                  name="billingCity"
                  value={billingAddress.city}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="New York"
                  required
                />
              </div>
              <div>
                <label htmlFor="billingState" className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  id="billingState"
                  name="billingState"
                  value={billingAddress.state}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="NY"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="billingPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  id="billingPostalCode"
                  name="billingPostalCode"
                  value={billingAddress.postalCode}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="10001"
                  required
                />
              </div>
              <div>
                <label htmlFor="billingCountry" className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <select
                  id="billingCountry"
                  name="billingCountry"
                  value={billingAddress.country}
                  onChange={(e) => setBillingAddress(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="flex justify-end">
          <motion.button
            type="submit"
            className="px-8 py-4 bg-primary-600 text-white rounded-lg font-medium text-lg disabled:opacity-70 hover:bg-primary-700 transition-colors w-full md:w-auto"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                <span>Processing...</span>
              </div>
            ) : (
              `Pay ${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'TND'
              }).format(amount)}`
            )}
          </motion.button>
        </div>
        
        <div className="mt-6 text-sm text-gray-500 text-center">
          <p>This is a test payment form. Use card number 4242 4242 4242 4242 with any expiry date in the future and any 3-digit CVC.</p>
        </div>
      </form>
    </motion.div>
  );
} 