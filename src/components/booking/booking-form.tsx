// src/components/booking/booking-form.tsx
'use client';

import { useState } from 'react';

interface BookingFormProps {
  hotelId: string;
  roomType: string;
  pricePerNight: number;
  onSubmit: (data: any) => void;
}

export function BookingForm({ hotelId, roomType, pricePerNight, onSubmit }: BookingFormProps) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');

  const calculateTotal = () => {
    if (!checkIn || !checkOut) return 0;
    const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    return nights * pricePerNight;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      hotel_id: hotelId,
      room_type: roomType,
      check_in_date: checkIn,
      check_out_date: checkOut,
      guests,
      total_price: calculateTotal(),
      special_requests: specialRequests
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Check-in</label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            required
            min={new Date().toISOString().split('T')[0]}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Check-out</label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            required
            min={checkIn || new Date().toISOString().split('T')[0]}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Guests</label>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {[1, 2, 3, 4, 5, 6].map(num => (
            <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Special Requests</label>
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Any special requests or requirements..."
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Room Price</span>
          <span className="font-medium">${pricePerNight}/night</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Nights</span>
          <span className="font-medium">
            {checkIn && checkOut ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)) : 0}
          </span>
        </div>
        <div className="flex justify-between items-center border-t pt-2">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-lg font-bold text-green-600">${calculateTotal()}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={!checkIn || !checkOut}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Book Now
      </button>
    </form>
  );
}