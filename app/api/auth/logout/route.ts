import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true, message: 'Berhasil logout' });
  res.cookies.delete('ukk_penguji_session');
  return res;
}
