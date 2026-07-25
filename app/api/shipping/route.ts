import { NextRequest, NextResponse } from "next/server";
import { queryD1 } from "@/lib/d1";

// シーケンス情報の取得
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seq = searchParams.get("seq");

    if (!seq) {
      return NextResponse.json({ error: "シーケンス番号が必要です" }, { status: 400 });
    }

    // 1. Order情報の取得
    const orderRaw = await queryD1(`SELECT * FROM shipping_orders WHERE seq_no = ?`, [seq]);
    const orderRows = orderRaw?.result?.[0]?.results?.rows || orderRaw?.rows || [];
    const orderCols = orderRaw?.result?.[0]?.results?.columns || orderRaw?.columns || [];

    // 型を Record<string, any> | null として明示定義
    let order: Record<string, any> | null = null;
    if (orderRows.length > 0) {
      const orderObj: Record<string, any> = {};
      orderCols.forEach((col: string, idx: number) => {
        orderObj[col] = orderRows[0][idx];
      });
      order = orderObj;
    }

    // 2. 関連画像一覧の取得
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

    // FEDEX tracking_no があればロック（閲覧のみ）
    const isLocked = Boolean(order?.fedex_tracking_no && String(order.fedex_tracking_no).trim() !== "");

    return NextResponse.json({
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

// 出荷情報の保存・ロック
export async function POST(req: NextRequest) {
  try {
    const { seq_no, customer_name, fedex_tracking_no } = await req.json();

    if (!seq_no) {
      return NextResponse.json({ error: "シーケンス番号が必要です" }, { status: 400 });
    }

    // すでにロックされているか確認
    const checkRaw = await queryD1(`SELECT fedex_tracking_no FROM shipping_orders WHERE seq_no = ?`, [seq_no]);
    const checkRows = checkRaw?.result?.[0]?.results?.rows || checkRaw?.rows || [];
    if (checkRows.length > 0 && checkRows[0][0]) {
      return NextResponse.json({ error: "このデータはすでにロックされているため編集できません" }, { status: 403 });
    }

    // 保存または更新（UPSERT）
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