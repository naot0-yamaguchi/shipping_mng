import { NextResponse } from 'next/server';
import net from 'net';
import { db } from '@/lib/firebaseAdmin'; // ご自身のDB設定に合わせて適宜変更

export async function POST(request: Request) {
  try {
    const { count = 100, printerIp = '192.168.1.100' } = await request.json();

    if (!printerIp) {
      return NextResponse.json({ success: false, message: 'プリンターIPが指定されていません' }, { status: 400 });
    }

    // 1. DBから現在の自動採番カウントを取得＆インクリメント（アトミック処理）
    const counterRef = db.collection('counters').doc('tms_sequence');
    
    let startNum = 1;
    let endNum = count;

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      const current = doc.exists ? doc.data()?.current_number || 0 : 0;
      
      startNum = current + 1;
      endNum = current + count;

      // DB側のカウントを更新
      transaction.set(counterRef, { current_number: endNum }, { merge: true });
    });

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

    // 3. プリンターへTCP送信
    const printResult = await sendToPrinter(printerIp, 9100, tsplCommand);

    if (printResult.success) {
      return NextResponse.json({ 
        success: true, 
        message: `${startNum}〜${endNum} (${count}枚) の発行コマンドを送信しました` 
      });
    } else {
      return NextResponse.json({ success: false, message: printResult.error }, { status: 500 });
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