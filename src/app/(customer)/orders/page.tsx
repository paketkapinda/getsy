// src/app/(customer)/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RestaurantOrder } from '@/types/database';
import { OrderCard } from '@/components/order/order-card';

export default function CustomerOrders() {
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'delivered'>('all');

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('restaurant_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Orders</h1>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      <div className="space-y-4">
        {orders.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No orders found</p>
            <a href="/restaurants" className="text-blue-600 hover:underline mt-2 inline-block">
              Browse restaurants
            </a>
          </div>
        )}
      </div>
    </div>
  );
}