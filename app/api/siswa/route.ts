import { NextResponse } from 'next/server';
import { getSiswaData } from '@/lib/sheets-client';

export async function GET() {
  try {
    const siswa = await getSiswaData();
    return NextResponse.json({ success: true, count: siswa.length, siswa });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
