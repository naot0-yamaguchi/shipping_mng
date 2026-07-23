import { NextResponse } from "next/server";
import { queryD1 } from "@/lib/d1";

export async function GET() {
  try {
    const rawResult = await queryD1(
      `SELECT * FROM shipping_images ORDER BY id DESC`
    );

    // queryD1 の戻り値、または results[0] から columns と rows を探す
    const columns: string[] = rawResult?.results?.[0]?.columns || rawResult?.columns || [];
    const rows: any[][] = rawResult?.results?.[0]?.rows || rawResult?.rows || [];

    let imagesList: any[] = [];

    if (columns.length > 0 && Array.isArray(rows)) {
      imagesList = rows.map((row) => {
        const item: Record<string, any> = {};
        columns.forEach((col, index) => {
          item[col] = row[index];
        });
        return item;
      });
    }

    return NextResponse.json({ images: imagesList });
  } catch (error) {
    console.error("Fetch D1 Error:", error);
    return NextResponse.json({ images: [], error: "取得に失敗しました" }, { status: 500 });
  }
}
