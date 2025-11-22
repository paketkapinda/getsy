// src/app/(business)/layout.tsx
'use client';
import '../globals.css'; // ✅ Doğru - bir üst klasörde
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setUser(user);

    // Check if user has a business
    const { data: businessData } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (!businessData) {
      router.push('/business/setup');
      return;
    }

    setBusiness(businessData);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (!user || !business) {
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
              <Link href="/business/dashboard" className="text-xl font-bold">
                {business.business_name}
              </Link>
              <div className="hidden md:flex space-x-6">
                <Link href="/business/dashboard" className="hover:text-blue-600">
                  Dashboard
                </Link>
                <Link href="/business/bookings" className="hover:text-blue-600">
                  Bookings
                </Link>
                <Link href="/business/orders" className="hover:text-blue-600">
                  Orders
                </Link>
                <Link href="/business/earnings" className="hover:text-blue-600">
                  Earnings
                </Link>
                <Link href="/business/settings" className="hover:text-blue-600">
                  Settings
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.email}
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
