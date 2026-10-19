import { NextResponse } from 'next/server';
import { getRubrikData } from '@/lib/sheets-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rubrik = await getRubrikData();
    return NextResponse.json(
      { success: true, rubrik },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
