// src/app/(business)/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types/database';

export default function BusinessSettings() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    website: '',
    description: ''
  });

  useEffect(() => {
    fetchBusiness();
  }, []);

  const fetchBusiness = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: businessData } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (businessData) {
      setBusiness(businessData);
      setFormData({
        business_name: businessData.business_name,
        email: businessData.email,
        phone: businessData.phone || '',
        address: businessData.address || '',
        city: businessData.city || '',
        website: businessData.website || '',
        description: businessData.description || ''
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('businesses')
      .update(formData)
      .eq('owner_id', user.id);

    if (!error) {
      setEditing(false);
      fetchBusiness(); // Refresh
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Business Settings</h1>
          <button
            onClick={() => setEditing(!editing)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {editing ? 'Cancel' : 'Edit Settings'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-4">Business Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Name</label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  disabled={!editing}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!editing}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!editing}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Location & Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!editing}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={!editing}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  disabled={!editing}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            disabled={!editing}
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
          />
        </div>

        {business && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Business Status</h4>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm ${
                business.status === 'verified' ? 'bg-green-100 text-green-800' :
                business.status === 'pending_verification' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {business.status.replace('_', ' ').toUpperCase()}
              </span>
              <p className="text-sm text-gray-600">
                Registered: {new Date(business.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {editing && (
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={() => setEditing(false)}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}