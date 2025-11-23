// src/app/(business)/bookings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { HotelBooking, Business } from '@/types/database';

export default function BusinessBookings() {
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    fetchBusinessAndBookings();
  }, []);

  const fetchBusinessAndBookings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get business - type assertion kullan
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (businessError || !businessData) {
      console.error('Business fetch error:', businessError);
      return;
    }

    setBusiness(businessData as Business);

    // Get hotel IDs for this business
    const { data: hotels, error: hotelsError } = await supabase
      .from('hotels')
      .select('id')
      .eq('business_id', (businessData as Business).id);

    if (hotelsError || !hotels) {
      console.error('Hotels fetch error:', hotelsError);
      return;
    }

    const hotelIds = hotels.map(h => h.id);

    // Get bookings for these hotels
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('hotel_bookings')
      .select('*')
      .in('hotel_id', hotelIds)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('Bookings fetch error:', bookingsError);
    }

    if (bookingsData) {
      setBookings(bookingsData as HotelBooking[]);
    }
    setLoading(false);
  };

  const updateBookingStatus = async (bookingId: string, status: string, response?: string) => {
    const updateData = {
      status,
      hotel_response: response,
      confirmed_at: status === 'confirmed' ? new Date().toISOString() : null
    };

    const { error } = await supabase
      .from('hotel_bookings')
      .update(updateData)
      .eq('id', bookingId);

    if (!error) {
      fetchBusinessAndBookings(); // Refresh
    } else {
      console.error('Update error:', error);
    }
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
      <h1 className="text-3xl font-bold mb-6">Manage Bookings</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Guest
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Room Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map(booking => (
              <tr key={booking.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    User #{booking.user_id.slice(0, 8)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(booking.check_in_date).toLocaleDateString()} - {new Date(booking.check_out_date).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {booking.room_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${booking.total_price}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {booking.status === 'pending' && (
                    <div className="space-x-2">
                      <button
                        onClick={() => updateBookingStatus(booking.id, 'confirmed', 'Booking confirmed!')}
                        className="text-green-600 hover:text-green-900"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => updateBookingStatus(booking.id, 'cancelled', 'Sorry, not available')}
                        className="text-red-600 hover:text-red-900"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {bookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No bookings found</p>
          </div>
        )}
      </div>
    </div>
  );
}
