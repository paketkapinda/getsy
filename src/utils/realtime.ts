// src/utils/realtime.ts
import { supabase } from '@/lib/supabase';

export function subscribeToBookingUpdates(bookingId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`booking:${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'hotel_bookings',
        filter: `id=eq.${bookingId}`,
      },
      callback
    )
    .subscribe();
}

export function subscribeToOrderUpdates(orderId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`order:${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'restaurant_orders',
        filter: `id=eq.${orderId}`,
      },
      callback
    )
    .subscribe();
}

export function subscribeToMessages(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `to_user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}