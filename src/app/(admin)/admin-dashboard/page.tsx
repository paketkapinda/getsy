'use client'; // ✅ BU SATIRI EKLEYİN

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AdminStats {
  total_users: number;
  total_businesses: number;
  pending_verifications: number;
  open_disputes: number;
  total_revenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Fetch users count
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Fetch businesses count
    const { count: totalBusinesses } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });

    // Fetch pending verifications
    const { count: pendingVerifications } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_verification');

    // Fetch open disputes
    const { count: openDisputes } = await supabase
      .from('disputes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    // Calculate total revenue (simplified)
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed');

    const totalRevenue = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    setStats({
      total_users: totalUsers || 0,
      total_businesses: totalBusinesses || 0,
      pending_verifications: pendingVerifications || 0,
      open_disputes: openDisputes || 0,
      total_revenue: totalRevenue
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">{stats?.total_users}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Total Businesses</h3>
          <p className="text-3xl font-bold text-green-600">{stats?.total_businesses}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Pending Verifications</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats?.pending_verifications}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Open Disputes</h3>
          <p className="text-3xl font-bold text-red-600">{stats?.open_disputes}</p>
        </div>
      </div>

      {/* Revenue Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">Platform Revenue</h3>
        <p className="text-4xl font-bold text-purple-600">${stats?.total_revenue.toFixed(2)}</p>
        <p className="text-gray-600 mt-2">Total revenue generated through the platform</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">User Management</h3>
          <p className="text-gray-600 mb-4">Manage users, view profiles, and handle issues</p>
          <a href="/admin/users" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Manage Users
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Business Verification</h3>
          <p className="text-gray-600 mb-4">Review and verify business applications</p>
          <a href="/admin/businesses" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Verify Businesses
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Dispute Resolution</h3>
          <p className="text-gray-600 mb-4">Handle customer and business disputes</p>
          <a href="/admin/disputes" className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Resolve Disputes
          </a>
        </div>
      </div>
    </div>
  );
}
