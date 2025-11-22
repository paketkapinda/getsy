// src/app/layout.tsx
import '../globals.css'; // ✅ Doğru - bir üst klasörde
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/providers/auth-provider';
import { RealtimeProvider } from '@/components/providers/realtime-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Georgia Tours Super App',
  description: 'Your all-in-one travel companion for Georgia',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <RealtimeProvider>
            {children}
          </RealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  );

}
