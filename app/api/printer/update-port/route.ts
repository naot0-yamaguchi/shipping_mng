import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.PRINTER_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { host, port } = await req.json();
  if (!host || !port) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  await queryD1(
    `INSERT OR REPLACE INTO printer_config (id, host, port, updated_at) VALUES ('main', ?, ?, CURRENT_TIMESTAMP)`,
    [host, Number(port)]
  );

  return NextResponse.json({ success: true, host, port });
}