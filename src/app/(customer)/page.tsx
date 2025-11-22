import { createServerSupabaseClient } from '@/lib/supabase-server'; // ✅ Yeni isim
import { redirect } from 'next/navigation';
import { BookingCard } from '@/components/booking/booking-card';
import { OrderCard } from '@/components/order/order-card';

export default async function CustomerHomePage() {
  const supabase = createServerSupabaseClient(); // ✅ Yeni isim
  const { data: { user } } = await supabase.auth.getUser(); // ✅ user'ı tanımla
  
  if (!user) {
    redirect('/auth/login');
  }

  // Get user's recent bookings
  const { data: recentBookings } = await supabase
    .from('hotel_bookings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3);

  // Get user's recent orders
  const { data: recentOrders } = await supabase
    .from('restaurant_orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Welcome back!</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Bookings</h2>
          {recentBookings?.length ? (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent bookings</p>
          )}
          <a href="/bookings" className="block mt-4 text-blue-600 hover:text-blue-800">
            View all bookings →
          </a>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
          {recentOrders?.length ? (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent orders</p>
          )}
          <a href="/orders" className="block mt-4 text-blue-600 hover:text-blue-800">
            View all orders →
          </a>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <a href="/bookings" className="bg-blue-600 text-white p-6 rounded-lg text-center hover:bg-blue-700">
          <h3 className="text-lg font-semibold">Book a Hotel</h3>
          <p className="text-blue-100">Find your perfect stay</p>
        </a>
        
        <a href="/orders" className="bg-green-600 text-white p-6 rounded-lg text-center hover:bg-green-700">
          <h3 className="text-lg font-semibold">Order Food</h3>
          <p className="text-green-100">Delicious meals delivered</p>
        </a>
        
        <a href="/profile" className="bg-purple-600 text-white p-6 rounded-lg text-center hover:bg-purple-700">
          <h3 className="text-lg font-semibold">My Profile</h3>
          <p className="text-purple-100">Manage your account</p>
        </a>
      </div>
    </div>
  );
}

