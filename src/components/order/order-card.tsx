// src/components/order/order-card.tsx
'use client';

import { RestaurantOrder } from '@/types/database';

interface OrderCardProps {
  order: RestaurantOrder;
}

export function OrderCard({ order }: OrderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Waiting for restaurant acceptance';
      case 'accepted':
        return 'Order accepted';
      case 'preparing':
        return 'Food is being prepared';
      case 'ready':
        return 'Ready for pickup/delivery';
      case 'dispatched':
        return 'On the way';
      case 'delivered':
        return 'Delivered';
      default:
        return status;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">Order #{order.id.slice(0, 8)}</h3>
          <p className="text-gray-600">
            {order.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'} • {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
          {order.status.toUpperCase()}
        </span>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">Status</p>
        <p className="font-medium">{getStatusText(order.status)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Items</p>
          <p className="font-medium">
            {Array.isArray(order.items) ? order.items.length : 0} items
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Price</p>
          <p className="font-medium">${order.total_price}</p>
        </div>
      </div>

      {order.estimated_delivery_time && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">Estimated Delivery</p>
          <p className="font-medium">
            {new Date(order.estimated_delivery_time).toLocaleTimeString()}
          </p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <a 
          href={`/orders/${order.id}`}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View Details
        </a>
        <span className="text-xs text-gray-500">
          {new Date(order.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}