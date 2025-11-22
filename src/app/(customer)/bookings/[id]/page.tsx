// src/app/(customer)/bookings/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { HotelBooking } from '@/types/database';

export default function BookingDetail() {
  const params = useParams();
  const [booking, setBooking] = useState<HotelBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchBooking();
    }
  }, [params.id]);

  const fetchBooking = async () => {
    const { data, error } = await supabase
      .from('hotel_bookings')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!error && data) {
      setBooking(data);
    }
    setLoading(false);
  };

  const cancelBooking = async () => {
    if (!booking) return;

    const { error } = await supabase
      .from('hotel_bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_initiated_by: 'customer'
      })
      .eq('id', booking.id);

    if (!error) {
      fetchBooking(); // Refresh data
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">Loading booking details...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-500">Booking not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold">Booking Details</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {booking.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Booking Information</h3>
            <div className="space-y-2">
              <p><strong>Confirmation:</strong> {booking.confirmation_number || 'Pending'}</p>
              <p><strong>Check-in:</strong> {new Date(booking.check_in_date).toLocaleDateString()}</p>
              <p><strong>Check-out:</strong> {new Date(booking.check_out_date).toLocaleDateString()}</p>
              <p><strong>Guests:</strong> {booking.guests}</p>
              <p><strong>Room Type:</strong> {booking.room_type}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Payment Information</h3>
            <div className="space-y-2">
              <p><strong>Total Price:</strong> ${booking.total_price}</p>
              <p><strong>Payment Status:</strong> 
                <span className={`ml-2 ${
                  booking.payment_status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {booking.payment_status.toUpperCase()}
                </span>
              </p>
              <p><strong>Booked On:</strong> {new Date(booking.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {booking.special_requests && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Special Requests</h3>
            <p className="text-gray-600">{booking.special_requests}</p>
          </div>
        )}

        {booking.hotel_response && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Hotel Response</h3>
            <p className="text-gray-600">{booking.hotel_response}</p>
          </div>
        )}

        {booking.status === 'pending' && (
          <div className="mt-6">
            <button
              onClick={cancelBooking}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600"
            >
              Cancel Booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}