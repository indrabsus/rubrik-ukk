import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

const configFilePath = path.join(process.cwd(), 'data', 'config.json');

function readConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      const raw = fs.readFileSync(configFilePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading config:', e);
  }
  return { kkm: 78 };
}

export async function GET() {
  const config = readConfig();
  return NextResponse.json({ success: true, ...config });
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('ukk_penguji_session');
    let isKajur = false;

    if (sessionCookie && sessionCookie.value) {
      try {
        const user = JSON.parse(sessionCookie.value);
        if (user.role === 'kajur' || user.username?.toLowerCase() === 'indrabatara') {
          isKajur = true;
        }
      } catch (e) {}
    }

    if (!isKajur) {
      return NextResponse.json(
        { success: false, message: 'Hanya akun Kajur yang memiliki wewenang mengubah KKM.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const newKkm = Number(body.kkm);

    if (isNaN(newKkm) || newKkm < 50 || newKkm > 100) {
      return NextResponse.json(
        { success: false, message: 'Nilai KKM harus di antara 50 sampai 100.' },
        { status: 400 }
      );
    }

    const currentConfig = readConfig();
    const updatedConfig = { ...currentConfig, kkm: newKkm };

    try {
      fs.writeFileSync(configFilePath, JSON.stringify(updatedConfig, null, 2), 'utf8');
    } catch (writeErr) {
      console.warn('Cannot write config file on readonly filesystem (e.g. Vercel serverless):', writeErr);
    }

    return NextResponse.json({ success: true, kkm: newKkm });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
