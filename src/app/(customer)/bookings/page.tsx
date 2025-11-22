// src/app/(customer)/bookings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { HotelBooking } from '@/types/database';
import { BookingCard } from '@/components/booking/booking-card';

export default function CustomerBookings() {
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    setLoading(true);
    let query = supabase
      .from('hotel_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setBookings(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="all">All Bookings</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="space-y-4">
        {bookings.map(booking => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
        {bookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No bookings found</p>
            <a href="/" className="text-blue-600 hover:underline mt-2 inline-block">
              Start exploring hotels
            </a>
          </div>
        )}
      </div>
    </div>
  );
}