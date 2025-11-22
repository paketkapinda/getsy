// src/app/download/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function DownloadPage() {
  const [qrData, setQrData] = useState<{ android?: string; ios?: string }>({});

  useEffect(() => {
    // Fetch QR codes
    const fetchQRCodes = async () => {
      try {
        const androidResponse = await fetch('/api/app-download/qr?platform=android');
        const iosResponse = await fetch('/api/app-download/qr?platform=ios');
        
        const androidData = await androidResponse.json();
        const iosData = await iosResponse.json();

        setQrData({
          android: androidData.qr_code_url,
          ios: iosData.qr_code_url
        });
      } catch (error) {
        console.error('Error fetching QR codes:', error);
      }
    };

    fetchQRCodes();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Download Our App
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Scan the QR code below to download the Georgia Tours Super App on your device.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Android Download */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-2xl font-semibold mb-4">Android</h3>
              {qrData.android ? (
                <img 
                  src={qrData.android} 
                  alt="Android QR Code" 
                  className="w-48 h-48 mx-auto mb-4"
                />
              ) : (
                <div className="w-48 h-48 mx-auto mb-4 bg-gray-200 rounded-lg animate-pulse" />
              )}
              <a 
                href={process.env.NEXT_PUBLIC_ANDROID_APP_URL}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 inline-block"
              >
                Download for Android
              </a>
            </div>

            {/* iOS Download */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="text-6xl mb-4">🍎</div>
              <h3 className="text-2xl font-semibold mb-4">iOS</h3>
              {qrData.ios ? (
                <img 
                  src={qrData.ios} 
                  alt="iOS QR Code" 
                  className="w-48 h-48 mx-auto mb-4"
                />
              ) : (
                <div className="w-48 h-48 mx-auto mb-4 bg-gray-200 rounded-lg animate-pulse" />
              )}
              <a 
                href={process.env.NEXT_PUBLIC_IOS_APP_URL}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 inline-block"
              >
                Download for iOS
              </a>
            </div>
          </div>

          <div className="mt-12 bg-blue-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Why Download Our App?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <h4 className="font-semibold mb-2">🚀 Faster Experience</h4>
                <p className="text-gray-600">Optimized performance and instant loading</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">📱 Push Notifications</h4>
                <p className="text-gray-600">Get instant updates on your bookings and orders</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">💫 Offline Access</h4>
                <p className="text-gray-600">Access your bookings and information offline</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}