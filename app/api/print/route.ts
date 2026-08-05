import { NextResponse } from 'next/server';
import net from 'net';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic'; // キャッシュを防止

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { count = 100 } = body;

        // 0. D1から最新のプリンター接続設定を取得（更新日時が新しいものを1件）
    const configRows = await queryD1(
      `SELECT host, port FROM printer_config ORDER BY updated_at DESC LIMIT 1`
    );

    // 配列が空の場合のチェック
    if (!configRows || configRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'D1にプリンター接続情報が存在しません' },
        { status: 400 }
      );
    }

    const host = configRows[0].host as string;
    const port = Number(configRows[0].port);

    console.log(`[Print API] Connecting to ${host}:${port}`);

    if (!host) {
      return NextResponse.json({ success: false, message: 'プリンターIP/ホストが指定されていません' }, { status: 400 });
    }

    // 1. D1から現在の自動採番カウントを取得
    const rows = await queryD1(
      `SELECT current_number FROM counters WHERE name = ?`,
      ['tms_sequence']
    );

    const current = rows.length > 0 ? (rows[0].current_number as number) : 0;
    const startNum = current + 1;
    const endNum = current + count;

    // DB側のカウントを更新 (レコードが存在しない場合は INSERT、存在する場合は UPDATE)
    if (rows.length === 0) {
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

    // 2. 自動採番された番号（startNum 〜 endNum）でTSPLを組み立て
    let tsplCommand = '';

    for (let i = startNum; i <= endNum; i++) {
      const formattedId = `TMS-${String(i).padStart(3, '0')}`;

      tsplCommand += `SIZE 80 mm, 50 mm\n`;
      tsplCommand += `GAP 3 mm, 0 mm\n`;
      tsplCommand += `CLS\n`;
      tsplCommand += `QRCODE 50,80,M,8,A,0,"${formattedId}"\n`;
      tsplCommand += `TEXT 360,110,"3.FNT",0,1,1,"ID"\n`;
      tsplCommand += `TEXT 360,150,"4.FNT",0,1,1,"${formattedId}"\n`;
      tsplCommand += `PRINT 1,1\n`;
    }

    // 3. プリンターへTCP送信（環境変数で指定したポートへ送信）
    const printResult = await sendToPrinter(host, port, tsplCommand);

    // プリンター送信結果の判定部分
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

function sendToPrinter(host: string, port: number, data: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.setTimeout(5000);

    client.connect(port, host, () => {
      client.write(Buffer.from(data, 'utf-8'), () => {
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