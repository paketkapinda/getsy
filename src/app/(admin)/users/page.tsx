'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Basit tür tanımı kullan
type UserType = 'customer' | 'business_owner' | 'admin';

interface SimpleProfile {
  id: string;
  full_name: string | null;
  email: string;
  user_type: UserType;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<SimpleProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && users) {
      setUsers(users as SimpleProfile[]);
    }
    setLoading(false);
  };

  const updateUserType = async (userId: string, userType: string) => {
    // Tür problemi olmayan basit çözüm
    const { error } = await supabase
      .from('profiles')
      .update({ user_type: userType })
      .eq('id', userId);

    if (!error) {
      fetchUsers();
    } else {
      console.error('Update error:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.full_name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.user_type === 'admin' 
                      ? 'bg-purple-100 text-purple-800'
                      : user.user_type === 'business_owner'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.user_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <select
                    value={user.user_type}
                    onChange={(e) => updateUserType(user.id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="customer">Customer</option>
                    <option value="business_owner">Business Owner</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
