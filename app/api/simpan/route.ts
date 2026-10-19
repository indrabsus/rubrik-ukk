import { NextResponse } from 'next/server';
import { saveNilaiToSheet } from '@/lib/sheets-client';
import { PenilaianPayload } from '@/types';

export async function POST(request: Request) {
  try {
    const payload: PenilaianPayload = await request.json();

    if (!payload.nis || !payload.nama) {
      return NextResponse.json({ success: false, message: 'Data siswa belum lengkap' }, { status: 400 });
    }

    const result = await saveNilaiToSheet(payload);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
