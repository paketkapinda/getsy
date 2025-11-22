// src/app/(admin)/layout.tsx
'use client';

import '../globals.css'; // ✅ Doğru - bir üst klasörde
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setUser(user);

    // Check if user is admin
  const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

// Type assertion kullan
if (!profile || (profile as Profile).user_type !== 'admin') {
  router.push('/');
  return;
}

    setIsAdmin(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <Link href="/admin" className="text-xl font-bold">
                Admin Panel
              </Link>
              <div className="hidden md:flex space-x-6">
                <Link href="/admin" className="hover:text-blue-600">
                  Dashboard
                </Link>
                <Link href="/admin/users" className="hover:text-blue-600">
                  Users
                </Link>
                <Link href="/admin/businesses" className="hover:text-blue-600">
                  Businesses
                </Link>
                <Link href="/admin/disputes" className="hover:text-blue-600">
                  Disputes
                </Link>
                <Link href="/admin/analytics" className="hover:text-blue-600">
                  Analytics
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.email} (Admin)
              </span>
              <button
                onClick={handleSignOut}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
