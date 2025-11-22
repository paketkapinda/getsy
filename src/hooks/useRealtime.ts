// src/hooks/useRealtime.ts
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToBookingUpdates, subscribeToOrderUpdates, subscribeToMessages } from '@/utils/realtime';

export function useRealtime() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages
    const messageSubscription = subscribeToMessages(user.id, (payload) => {
      console.log('New message received:', payload);
      // You can dispatch an event or update state here
    });

    return () => {
      messageSubscription.unsubscribe();
    };
  }, [user]);

  const subscribeToBooking = (bookingId: string, callback: (payload: any) => void) => {
    return subscribeToBookingUpdates(bookingId, callback);
  };

  const subscribeToOrder = (orderId: string, callback: (payload: any) => void) => {
    return subscribeToOrderUpdates(orderId, callback);
  };

  return {
    subscribeToBooking,
    subscribeToOrder,
  };
}