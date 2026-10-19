import { NextResponse } from 'next/server';
import { getSiswaData } from '@/lib/sheets-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Pastikan request selalu segar
    const siswa = await getSiswaData();
    return NextResponse.json(
      { success: true, count: siswa.length, siswa },
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
