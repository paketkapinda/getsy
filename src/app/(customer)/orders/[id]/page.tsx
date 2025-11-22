// src/app/(customer)/orders/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { RestaurantOrder } from '@/types/database';
import { OrderTimeline } from '@/components/order/order-timeline';

export default function OrderDetail() {
  const params = useParams();
  const [order, setOrder] = useState<RestaurantOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  const fetchOrder = async () => {
    const { data, error } = await supabase
      .from('restaurant_orders')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!error && data) {
      setOrder(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-500">Order not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold">Order Details</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
            order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {order.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold mb-2">Order Information</h3>
            <div className="space-y-2">
              <p><strong>Order ID:</strong> {order.id.slice(0, 8)}</p>
              <p><strong>Delivery Type:</strong> {order.delivery_type}</p>
              <p><strong>Items:</strong> {Array.isArray(order.items) ? order.items.length : 0}</p>
              <p><strong>Ordered:</strong> {new Date(order.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Payment & Delivery</h3>
            <div className="space-y-2">
              <p><strong>Total Price:</strong> ${order.total_price}</p>
              <p><strong>Payment Status:</strong> 
                <span className={`ml-2 ${
                  order.payment_status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {order.payment_status.toUpperCase()}
                </span>
              </p>
              {order.estimated_delivery_time && (
                <p><strong>Estimated Delivery:</strong> {new Date(order.estimated_delivery_time).toLocaleTimeString()}</p>
              )}
            </div>
          </div>
        </div>

        {order.delivery_address && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Delivery Address</h3>
            <p className="text-gray-600">{order.delivery_address}</p>
          </div>
        )}

        {order.special_instructions && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Special Instructions</h3>
            <p className="text-gray-600">{order.special_instructions}</p>
          </div>
        )}

        <OrderTimeline order={order} />
      </div>
    </div>
  );
}