// src/app/(customer)/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

export default function CustomerProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    preferred_language: 'en'
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setFormData({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        preferred_language: profileData.preferred_language
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(formData)
      .eq('id', user.id);

    if (!error) {
      setEditing(false);
      fetchProfile(); // Refresh
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <button
            onClick={() => setEditing(!editing)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
            <h3 className="font-semibold mb-4">Preferences & Stats</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Preferred Language</label>
                <select
                  value={formData.preferred_language}
                  onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                  disabled={!editing}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                >
                  <option value="en">English</option>
                  <option value="tr">Turkish</option>
                  <option value="ka">Georgian</option>
                  <option value="ru">Russian</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{profile?.total_bookings || 0}</p>
                  <p className="text-sm text-gray-600">Total Bookings</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{profile?.total_orders || 0}</p>
                  <p className="text-sm text-gray-600">Total Orders</p>
                </div>
              </div>
            </div>
          </div>
        </div>

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