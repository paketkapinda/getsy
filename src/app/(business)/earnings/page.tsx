// src/app/(business)/earnings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface EarningsData {
  total_earnings: number;
  pending_payout: number;
  this_month: number;
  this_week: number;
}

export default function BusinessEarnings() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: businessData } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (!businessData) return;

    setBusiness(businessData);

    // Calculate earnings (simplified)
    const totalEarnings = businessData.total_revenue || 0;
    const pendingPayout = totalEarnings * 0.8; // 80% after platform commission

    setEarnings({
      total_earnings: totalEarnings,
      pending_payout: pendingPayout,
      this_month: totalEarnings * 0.3, // Simplified
      this_week: totalEarnings * 0.1   // Simplified
    });

    // Fetch payout history
    const { data: payoutsData } = await supabase
      .from('payouts')
      .select('*')
      .eq('business_id', businessData.id)
      .order('requested_at', { ascending: false });

    if (payoutsData) {
      setPayouts(payoutsData);
    }

    setLoading(false);
  };

  const requestPayout = async () => {
    if (!business || !earnings) return;

    const { error } = await supabase
      .from('payouts')
      .insert({
        business_id: business.id,
        amount: earnings.pending_payout,
        status: 'pending',
        method: 'bank_transfer'
      });

    if (!error) {
      fetchEarningsData(); // Refresh
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">Loading earnings data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Earnings & Payouts</h1>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Total Earnings</h3>
          <p className="text-3xl font-bold text-green-600">${earnings?.total_earnings.toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Available for Payout</h3>
          <p className="text-3xl font-bold text-blue-600">${earnings?.pending_payout.toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">This Month</h3>
          <p className="text-3xl font-bold text-purple-600">${earnings?.this_month.toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">This Week</h3>
          <p className="text-3xl font-bold text-orange-600">${earnings?.this_week.toFixed(2)}</p>
        </div>
      </div>

      {/* Payout Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold mb-2">Request Payout</h3>
            <p className="text-gray-600">Available balance: ${earnings?.pending_payout.toFixed(2)}</p>
          </div>
          <button
            onClick={requestPayout}
            disabled={!earnings || earnings.pending_payout < 50}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Request Payout
          </button>
        </div>
        {earnings && earnings.pending_payout < 50 && (
          <p className="text-red-500 text-sm mt-2">Minimum payout amount is $50</p>
        )}
      </div>

      {/* Payout History */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b">
          <h3 className="text-xl font-semibold">Payout History</h3>
        </div>
        <div className="divide-y">
          {payouts.map(payout => (
            <div key={payout.id} className="px-6 py-4 flex justify-between items-center">
              <div>
                <p className="font-medium">${payout.amount}</p>
                <p className="text-sm text-gray-500">
                  {new Date(payout.requested_at).toLocaleDateString()} • {payout.method}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                payout.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {payout.status}
              </span>
            </div>
          ))}
          {payouts.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No payout history yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}