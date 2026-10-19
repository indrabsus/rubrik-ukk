import { NextResponse } from 'next/server';
import { findGuruByUsername, DEFAULT_PASSWORD } from '@/lib/auth-data';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username) {
      return NextResponse.json({ success: false, message: 'Username wajib diisi' }, { status: 400 });
    }

    const guru = findGuruByUsername(username);
    if (!guru) {
      return NextResponse.json({ success: false, message: 'Akun Penguji tidak ditemukan' }, { status: 401 });
    }

    // Verifikasi password (default rpl2026 atau custom)
    const validPassword = DEFAULT_PASSWORD;
    if (password && password !== validPassword) {
      return NextResponse.json({ success: false, message: 'Password salah' }, { status: 401 });
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
