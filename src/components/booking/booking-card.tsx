// src/components/booking/booking-card.tsx
'use client';

import { HotelBooking } from '@/types/database';

interface BookingCardProps {
  booking: HotelBooking;
}

export function BookingCard({ booking }: BookingCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">Booking #{booking.id.slice(0, 8)}</h3>
          <p className="text-gray-600">
            {new Date(booking.check_in_date).toLocaleDateString()} - {new Date(booking.check_out_date).toLocaleDateString()}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
          {booking.status.toUpperCase()}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Room Type</p>
          <p className="font-medium">{booking.room_type}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Guests</p>
          <p className="font-medium">{booking.guests}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Price</p>
          <p className="font-medium">${booking.total_price}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Payment</p>
          <p className={`font-medium ${
            booking.payment_status === 'completed' ? 'text-green-600' : 'text-yellow-600'
          }`}>
            {booking.payment_status.toUpperCase()}
          </p>
        </div>
      </div>

      {booking.special_requests && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">Special Requests</p>
          <p className="text-sm">{booking.special_requests}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <a 
          href={`/bookings/${booking.id}`}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View Details
        </a>
        <span className="text-xs text-gray-500">
          {new Date(booking.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}