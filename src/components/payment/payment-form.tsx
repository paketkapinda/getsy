// src/components/payment/payment-form.tsx
'use client';

import { useState } from 'react';

interface PaymentFormProps {
  amount: number;
  onPaymentSuccess: (paymentData: any) => void;
}

export function PaymentForm({ amount, onPaymentSuccess }: PaymentFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'iban_transfer' | 'crypto' | 'wallet'>('credit_card');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate payment processing
    setTimeout(() => {
      const paymentData = {
        id: `pay_${Date.now()}`,
        amount,
        method: paymentMethod,
        status: 'completed',
        timestamp: new Date().toISOString()
      };
      onPaymentSuccess(paymentData);
      setLoading(false);
    }, 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Payment Method</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setPaymentMethod('credit_card')}
            className={`p-4 border rounded-lg text-center ${
              paymentMethod === 'credit_card' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            💳 Credit Card
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('iban_transfer')}
            className={`p-4 border rounded-lg text-center ${
              paymentMethod === 'iban_transfer' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            🏦 Bank Transfer
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('crypto')}
            className={`p-4 border rounded-lg text-center ${
              paymentMethod === 'crypto' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            ₿ Crypto
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('wallet')}
            className={`p-4 border rounded-lg text-center ${
              paymentMethod === 'wallet' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            💰 Wallet
          </button>
        </div>
      </div>

      {paymentMethod === 'credit_card' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Card Number</label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
              <input
                type="text"
                placeholder="MM/YY"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CVV</label>
              <input
                type="text"
                placeholder="123"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {paymentMethod === 'iban_transfer' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            You will be redirected to your bank to complete the payment. 
            Please have your online banking details ready.
          </p>
        </div>
      )}

      {paymentMethod === 'crypto' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-800">
            Crypto payment details will be shown after order confirmation.
            Supported: BTC, ETH, USDT
          </p>
        </div>
      )}

      {paymentMethod === 'wallet' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            Payment will be deducted from your wallet balance.
            Current balance: $0.00
          </p>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total Amount</span>
          <span className="text-2xl font-bold text-green-600">${amount}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing Payment...' : `Pay $${amount}`}
      </button>
    </form>
  );
}