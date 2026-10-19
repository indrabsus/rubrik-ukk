import { NextResponse } from 'next/server';
import { getRubrikData } from '@/lib/sheets-client';

export async function GET() {
  try {
    const rubrik = await getRubrikData();
    return NextResponse.json({ success: true, rubrik });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
