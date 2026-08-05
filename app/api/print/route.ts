import { NextResponse } from 'next/server';
import net from 'net';
// @ts-ignore
import EscPosEncoder from 'esc-pos-encoder';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { count = 100 } = body;

    // 0. D1からプリンター接続情報を取得
    const rawResult = await queryD1(
      `SELECT host, port FROM printer_config WHERE id = 'main'`
    );

    let host: string | undefined;
    let port: number | undefined;

    if (rawResult && rawResult.columns && rawResult.rows && rawResult.rows.length > 0) {
      const columns: string[] = rawResult.columns;
      const row: any[] = rawResult.rows[0];

      const hostIdx = columns.indexOf('host');
      const portIdx = columns.indexOf('port');

      if (hostIdx !== -1) host = row[hostIdx];
      if (portIdx !== -1) port = Number(row[portIdx]);
    }

    if (!host || !port) {
      return NextResponse.json(
        { success: false, message: 'D1から有効な接続情報を取得できませんでした' },
        { status: 400 }
      );
    }

    console.log(`[Print API] Connecting to ${host}:${port}`);

    // 1. D1から現在の採番を取得（rawResult形式に合わせて修正）
    const counterRaw = await queryD1(
      `SELECT current_number FROM counters WHERE name = ?`,
      ['tms_sequence']
    );

    let current = 0;
    const hasRecord = counterRaw && counterRaw.rows && counterRaw.rows.length > 0;

    if (hasRecord) {
      const colIdx = counterRaw.columns.indexOf('current_number');
      if (colIdx !== -1) {
        current = Number(counterRaw.rows[0][colIdx]) || 0;
      }
    }

    const startNum = current + 1;
    const endNum = current + count;

    // カウントを更新
    if (!hasRecord) {
      await queryD1(
        `INSERT INTO counters (name, current_number) VALUES (?, ?)`,
        ['tms_sequence', endNum]
      );
    } else {
      await queryD1(
        `UPDATE counters SET current_number = ? WHERE name = ?`,
        [endNum, 'tms_sequence']
      );
    }

    // 2. ESC/POS バイナリデータの構築
    const encoder = new EscPosEncoder();
    
    for (let i = startNum; i <= endNum; i++) {
      const formattedId = `TMS-${String(i).padStart(3, '0')}`;

      encoder
        .initialize()
        .align('center')
        .qrcode(formattedId, 1, 8, 'h') // QRコード印字
        .newline()
        .text(`ID: ${formattedId}`)       // IDテキスト印字
        .newline()
        .newline()
        .cut('full');                     // オートカット実行
    }

    // Uint8Array を Buffer に変換
    const printBuffer = Buffer.from(encoder.encode());

    // 3. プリンターへTCP送信
    const printResult = await sendToPrinter(host, port, printBuffer);

    if (printResult.success) {
      return NextResponse.json({ 
        success: true, 
        message: `${startNum}〜${endNum} (${count}枚) の発行コマンドを送信しました` 
      });
    } else {
      return NextResponse.json(
        { success: false, message: printResult.error }, 
        { status: 500 }
      );
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Data の型を Buffer に変更
function sendToPrinter(host: string, port: number, data: Buffer): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.setTimeout(5000);

    client.connect(port, host, () => {
      // Buffer をそのまま書き込み
      client.write(data, () => {
        client.end();
        resolve({ success: true });
      });
    });

    client.on('timeout', () => {
      client.destroy();
      resolve({ success: false, error: 'プリンター接続タイムアウト' });
    });

    client.on('error', (err) => {
      client.destroy();
      resolve({ success: false, error: `通信エラー: ${err.message}` });
    });
  });
}
