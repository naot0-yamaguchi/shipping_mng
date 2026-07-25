import { NextRequest, NextResponse } from "next/server";
import { queryD1 } from "@/lib/d1";

// 顧客検索 (GET /api/customers?q=xxx)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const rawData = await queryD1(
      `SELECT * FROM customers WHERE name LIKE ? ORDER BY name ASC LIMIT 10`,
      [`%${q}%`]
    );

    const rows = rawData?.result?.[0]?.results?.rows || rawData?.rows || [];
    const cols = rawData?.result?.[0]?.results?.columns || rawData?.columns || ["id", "name"];

    const customers = rows.map((row: any[]) => ({
      id: row[cols.indexOf("id")],
      name: row[cols.indexOf("name")],
    }));

    return NextResponse.json({ customers });
  } catch (error) {
    return NextResponse.json({ customers: [], error: "取得失敗" }, { status: 500 });
  }
}

// 顧客新規登録 (POST /api/customers)
export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "名前が必要です" }, { status: 400 });
    }

    await queryD1(`INSERT INTO customers (name) VALUES (?)`, [name.trim()]);
    return NextResponse.json({ success: true, name: name.trim() });
  } catch (error) {
    return NextResponse.json({ error: "登録失敗（重複等の可能性）" }, { status: 500 });
  }
}