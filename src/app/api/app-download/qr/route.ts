// src/app/api/app-download/qr/route.ts
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform');
  
  let downloadUrl = '';
  
  if (platform === 'android') {
    downloadUrl = process.env.NEXT_PUBLIC_ANDROID_APP_URL!;
  } else if (platform === 'ios') {
    downloadUrl = process.env.NEXT_PUBLIC_IOS_APP_URL!;
  } else {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  try {
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(downloadUrl);
    
    // Update scan count in database (you would implement this)
    
    return NextResponse.json({
      platform,
      qr_code_url: qrCodeUrl,
      download_url: downloadUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}