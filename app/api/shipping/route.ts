import { NextRequest, NextResponse } from "next/server";
import { queryD1 } from "@/lib/d1";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seq = searchParams.get("seq");
    const fedex = searchParams.get("fedex");

    if (!seq && !fedex) {
      return NextResponse.json(
        { error: "シーケンス番号(?seq=) または FEDEX追跡番号(?fedex=) が必要です" },
        { status: 400 }
      );
    }

    // ----------------------------------------------------
    // FEDEX 追跡番号検索（複数件カードリスト対応）
    // ----------------------------------------------------
    if (fedex) {
      const orderRaw = await queryD1(
        `SELECT * FROM shipping_orders WHERE fedex_tracking_no LIKE ? ORDER BY updated_at DESC`,
        [`%${fedex.trim()}%`]
      );
      const orderRows = orderRaw?.result?.[0]?.results?.rows || orderRaw?.rows || [];
      const orderCols = orderRaw?.result?.[0]?.results?.columns || orderRaw?.columns || [];

      if (orderRows.length === 0) {
        return NextResponse.json({ results: [] });
      }

      // 該当する全 Order と、それぞれの代表サムネイル画像を取得
      const results = await Promise.all(
        orderRows.map(async (row: any[]) => {
          const orderObj: Record<string, any> = {};
          orderCols.forEach((col: string, idx: number) => {
            orderObj[col] = row[idx];
          });

          // 各 Order の最新画像を1枚取得（サムネイル用）
          const imgRaw = await queryD1(
            `SELECT file_name FROM shipping_images WHERE seq_no = ? ORDER BY id DESC LIMIT 1`,
            [orderObj.seq_no]
          );
          const imgRows = imgRaw?.result?.[0]?.results?.rows || imgRaw?.rows || [];
          const thumbFileName = imgRows.length > 0 ? imgRows[0][0] : null;

          return {
            seq_no: orderObj.seq_no,
            customer_name: orderObj.customer_name || "",
            fedex_tracking_no: orderObj.fedex_tracking_no || "",
            thumbnail: thumbFileName,
            isLocked: Boolean(orderObj.fedex_tracking_no && String(orderObj.fedex_tracking_no).trim() !== ""),
          };
        })
      );

      return NextResponse.json({ results });
    }

    // ----------------------------------------------------
    // 単一 シーケンス番号 詳細取得
    // ----------------------------------------------------
    const orderRaw = await queryD1(`SELECT * FROM shipping_orders WHERE seq_no = ?`, [seq]);
    const orderRows = orderRaw?.result?.[0]?.results?.rows || orderRaw?.rows || [];
    const orderCols = orderRaw?.result?.[0]?.results?.columns || orderRaw?.columns || [];

    let order: Record<string, any> | null = null;
    if (orderRows.length > 0) {
      const orderObj: Record<string, any> = {};
      orderCols.forEach((col: string, idx: number) => {
        orderObj[col] = orderRows[0][idx];
      });
      order = orderObj;
    }

    const imgRaw = await queryD1(`SELECT * FROM shipping_images WHERE seq_no = ? ORDER BY id DESC`, [seq]);
    const imgRows = imgRaw?.result?.[0]?.results?.rows || imgRaw?.rows || [];
    const imgCols = imgRaw?.result?.[0]?.results?.columns || imgRaw?.columns || [];

    const images = imgRows.map((row: any[]) => {
      const item: Record<string, any> = {};
      imgCols.forEach((col: string, idx: number) => {
        item[col] = row[idx];
      });
      return item;
    });

    const isLocked = Boolean(order?.fedex_tracking_no && String(order.fedex_tracking_no).trim() !== "");

    return NextResponse.json({
      seqNo: seq,
      seq_no: seq,
      order,
      images,
      isLocked,
    });
  } catch (error) {
    console.error("Fetch Shipping Error:", error);
    return NextResponse.json({ error: "データ取得エラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { seq_no, customer_name, fedex_tracking_no } = await req.json();

    if (!seq_no) {
      return NextResponse.json({ error: "シーケンス番号が必要です" }, { status: 400 });
    }

    const checkRaw = await queryD1(`SELECT fedex_tracking_no FROM shipping_orders WHERE seq_no = ?`, [seq_no]);
    const checkRows = checkRaw?.result?.[0]?.results?.rows || checkRaw?.rows || [];
    if (checkRows.length > 0 && checkRows[0][0]) {
      return NextResponse.json({ error: "このデータはすでにロックされているため編集できません" }, { status: 403 });
    }

    await queryD1(
      `INSERT INTO shipping_orders (seq_no, customer_name, fedex_tracking_no, updated_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(seq_no) DO UPDATE SET 
         customer_name = excluded.customer_name,
         fedex_tracking_no = excluded.fedex_tracking_no,
         updated_at = CURRENT_TIMESTAMP`,
      [seq_no, customer_name || "", fedex_tracking_no || ""]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save Shipping Error:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}