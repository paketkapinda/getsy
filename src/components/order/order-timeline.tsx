// src/components/order/order-timeline.tsx
'use client';

import { RestaurantOrder } from '@/types/database';

interface OrderTimelineProps {
  order: RestaurantOrder;
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const steps = [
    { status: 'pending', label: 'Order Placed', description: 'Your order has been received' },
    { status: 'accepted', label: 'Order Accepted', description: 'Restaurant has accepted your order' },
    { status: 'preparing', label: 'Preparing Food', description: 'Your food is being prepared' },
    { status: 'ready', label: 'Ready', description: 'Your order is ready for pickup/delivery' },
    { status: 'dispatched', label: 'Dispatched', description: 'Your order is on the way' },
    { status: 'delivered', label: 'Delivered', description: 'Your order has been delivered' },
  ];

  const currentStepIndex = steps.findIndex(step => step.status === order.status);

  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-4">Order Progress</h3>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.status} className="flex items-start">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              index <= currentStepIndex 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-300 text-gray-600'
            }`}>
              {index < currentStepIndex ? '✓' : index + 1}
            </div>
            <div className="ml-4">
              <p className={`font-medium ${
                index <= currentStepIndex ? 'text-green-600' : 'text-gray-500'
              }`}>
                {step.label}
              </p>
              <p className="text-sm text-gray-600">{step.description}</p>
              {index === currentStepIndex && order.status === 'preparing' && order.preparation_started_at && (
                <p className="text-xs text-gray-500 mt-1">
                  Started at: {new Date(order.preparation_started_at).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}