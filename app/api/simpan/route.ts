import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { saveNilaiToSheet } from '@/lib/sheets-client';
import { PenilaianPayload } from '@/types';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('ukk_penguji_session');
    if (sessionCookie?.value) {
      try {
        const user = JSON.parse(sessionCookie.value);
        if (user.role === 'admin' || user.username?.toLowerCase() === 'mutiarazahra') {
          return NextResponse.json(
            { success: false, message: 'Akun Admin Mutiara Zahra bertugas mencetak PDF dan tidak diizinkan memberi nilai.' },
            { status: 403 }
          );
        }
      } catch (e) {}
    }

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
