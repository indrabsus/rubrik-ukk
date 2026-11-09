import { NextResponse } from 'next/server';
import { findGuruByUsername, ACCESS_PIN } from '@/lib/auth-data';

export async function POST(request: Request) {
  try {
    const { username, pin } = await request.json();

    // Verifikasi PIN Akses (4231)
    if (!pin) {
      return NextResponse.json({ success: false, message: 'PIN Akses wajib diisi' }, { status: 400 });
    }

    if (String(pin).trim() !== ACCESS_PIN) {
      return NextResponse.json({ success: false, message: 'PIN Akses salah' }, { status: 401 });
    }

    if (!username) {
      return NextResponse.json({ success: false, message: 'Silakan pilih nama penguji / admin' }, { status: 400 });
    }

    const guru = findGuruByUsername(username);
    if (!guru) {
      return NextResponse.json({ success: false, message: 'Akun Penguji / Admin tidak ditemukan' }, { status: 401 });
    }

    const res = NextResponse.json({
      success: true,
      message: `Selamat datang, ${guru.nama}!`,
      user: guru
    });

    // Simpan session cookie (berlaku 7 hari)
    res.cookies.set('ukk_penguji_session', JSON.stringify(guru), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
