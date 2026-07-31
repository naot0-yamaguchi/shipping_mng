import { NextResponse } from "next/server";
import { queryD1 } from "@/lib/d1";

export async function POST(request: Request) {
  try {
    const { seqNos, fedexTrackingNo } = await request.json();

    if (!Array.isArray(seqNos) || seqNos.length === 0 || !fedexTrackingNo) {
      return NextResponse.json(
        { error: "シーケンス番号リストとFEDEX追跡番号は必須です。" },
        { status: 400 }
      );
    }

    // SQLの IN 句用プレースホルダーを作成 (?, ?, ?)
    const placeholders = seqNos.map(() => "?").join(", ");
    const sql = `
      UPDATE shipping 
      SET fedex_tracking_no = ? 
      WHERE seq_no IN (${placeholders})
    `;

    // バインドパラメータ: [fedexTrackingNo, ...seqNos]
    const params = [fedexTrackingNo, ...seqNos];

    await queryD1(sql, params);

    return NextResponse.json({
      success: true,
      message: `${seqNos.length}件の荷物にFEDEX追跡番号を紐付けました。`,
    });
  } catch (error) {
    console.error("Bulk FedEx Update Error:", error);
    return NextResponse.json(
      { error: "一括更新処理に失敗しました。" },
      { status: 500 }
    );
  }
}