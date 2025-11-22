// src/components/payment/payment-methods.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PaymentMethod } from '@/types/database';

export function PaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('active', true)
      .order('type');

    if (!error && data) {
      setPaymentMethods(data);
    }
    setLoading(false);
  };

  const togglePaymentMethod = async (methodId: string, active: boolean) => {
    const { error } = await supabase
      .from('payment_methods')
      .update({ active })
      .eq('id', methodId);

    if (!error) {
      fetchPaymentMethods();
    }
  };

  if (loading) {
    return <div>Loading payment methods...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Available Payment Methods</h3>
      {paymentMethods.map(method => (
        <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium capitalize">{method.type.replace('_', ' ')}</h4>
            <p className="text-sm text-gray-500">
              {method.active ? 'Active' : 'Inactive'}
            </p>
          </div>
          <button
            onClick={() => togglePaymentMethod(method.id, !method.active)}
            className={`px-4 py-2 rounded ${
              method.active 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {method.active ? 'Disable' : 'Enable'}
          </button>
        </div>
      ))}
    </div>
  );
}