// src/hooks/usePayments.ts
import { useState } from 'react';
import { createStripePaymentIntent, confirmStripePayment } from '@/utils/payments';

export function usePayments() {
  const [processing, setProcessing] = useState(false);

  const createPayment = async (amount: number, currency: string = 'usd') => {
    setProcessing(true);
    try {
      const result = await createStripePaymentIntent(amount, currency);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const confirmPayment = async (paymentIntentId: string) => {
    setProcessing(true);
    try {
      const success = await confirmStripePayment(paymentIntentId);
      return success;
    } catch (error) {
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  return {
    createPayment,
    confirmPayment,
    processing,
  };
}