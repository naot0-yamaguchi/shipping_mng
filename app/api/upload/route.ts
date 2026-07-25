import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { queryD1 } from "@/lib/d1";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(req: NextRequest) {
  console.log("=== 📸 [UPLOAD API] Request Received ===");

  try {
    // 1. 環境変数のチェック
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_BUCKET_NAME) {
      console.error("❌ [UPLOAD API] R2の環境変数が設定されていません (R2_ACCOUNT_ID または R2_BUCKET_NAME)");
      return NextResponse.json(
        { error: "R2環境変数の設定エラーが発生しています" },
        { status: 500 }
      );
    }

    // 2. FormDataの取得
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const seqNo = (formData.get("seq_no") as string) || "UNKNOWN";

    console.log(`[UPLOAD API] seq_no: ${seqNo}, file: ${file?.name}, size: ${file?.size} bytes, type: ${file?.type}`);

    if (!file) {
      console.error("❌ [UPLOAD API] ファイルがリクエストに含まれていません");
      return NextResponse.json({ error: "ファイルが指定されていません" }, { status: 400 });
    }

    // ArrayBuffer & Buffer 変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${Date.now()}_${file.name}`;

    // 3. Cloudflare R2 へ保存
    console.log(`⏳ [UPLOAD API] R2 Uploading... Key: ${fileName}`);
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type || "image/jpeg",
      })
    );
    console.log("✅ [UPLOAD API] R2 Upload Success");

    // 4. Cloudflare D1 へレコード追記
    console.log(`⏳ [UPLOAD API] D1 Inserting Record for seq_no: ${seqNo}`);

    // ★ 親テーブル(shipping_orders)に該当の seq_no が無ければ先に作成（外部キーエラー防止）
    await queryD1(
      `INSERT OR IGNORE INTO shipping_orders (seq_no) VALUES (?)`,
      [seqNo]
    );

    // 現在のJST（日本時間）文字列を作成（YYYY-MM-DD HH:mm:ss）
    const jstNow = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" });

    // 画像レコードの挿入
    await queryD1(
      `INSERT INTO shipping_images (seq_no, file_name, original_name, mime_type, file_size, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [seqNo, fileName, file.name, file.type || "image/jpeg", file.size, jstNow]
    ).catch(async (err) => {
      // created_at カラムが無い場合のフォールバック
      console.warn("⚠️ [UPLOAD API] created_atなしでD1へフォールバック挿入します:", err.message);
      await queryD1(
        `INSERT INTO shipping_images (seq_no, file_name, original_name, mime_type, file_size) VALUES (?, ?, ?, ?, ?)`,
        [seqNo, fileName, file.name, file.type || "image/jpeg", file.size]
      );
    });

    console.log("✅ [UPLOAD API] D1 Insert Success");
    console.log("=== 📸 [UPLOAD API] Complete ===");

    return NextResponse.json({ success: true, fileName });
  } catch (error: any) {
    console.error("❌ === [UPLOAD API] EXCEPTION ERROR ===");
    console.error(error);
    return NextResponse.json(
      { error: error?.message || "アップロード処理中に内部エラーが発生しました" },
      { status: 500 }
    );
  }
}