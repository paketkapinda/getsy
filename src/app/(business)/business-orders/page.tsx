// src/app/(business)/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RestaurantOrder } from '@/types/database';

export default function BusinessOrders() {
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);

  useEffect(() => {
    fetchBusinessAndOrders();
  }, []);

  const fetchBusinessAndOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: businessData } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (!businessData) return;

    setBusiness(businessData);

    // Get restaurant IDs for this business
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('id')
      .eq('business_id', businessData.id);

    if (!restaurants) return;

    const restaurantIds = restaurants.map(r => r.id);

    // Get orders for these restaurants
    const { data: ordersData } = await supabase
      .from('restaurant_orders')
      .select('*')
      .in('restaurant_id', restaurantIds)
      .order('created_at', { ascending: false });

    if (ordersData) {
      setOrders(ordersData);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('restaurant_orders')
      .update({ status })
      .eq('id', orderId);

    if (!error) {
      fetchBusinessAndOrders(); // Refresh
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Manage Orders</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Delivery Type
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
            {orders.map(order => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  #{order.id.slice(0, 8)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {Array.isArray(order.items) ? order.items.length : 0} items
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.delivery_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${order.total_price}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {order.status === 'pending' && (
                    <div className="space-x-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'accepted')}
                        className="text-green-600 hover:text-green-900"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'rejected')}
                        className="text-red-600 hover:text-red-900"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {order.status === 'accepted' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="text-orange-600 hover:text-orange-900"
                    >
                      Mark Ready
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}