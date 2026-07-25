import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { queryD1 } from "@/lib/d1";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

// 画像のアップロード (POST)
export async function POST(req: NextRequest) {
  console.log("=== 📸 [UPLOAD API] Request Received ===");

  try {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_BUCKET_NAME) {
      console.error("❌ [UPLOAD API] R2環境変数が未設定です");
      return NextResponse.json({ error: "R2環境変数の設定エラーが発生しています" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const seqNo = (formData.get("seq_no") as string) || "UNKNOWN";

    if (!file) {
      return NextResponse.json({ error: "ファイルが指定されていません" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${Date.now()}_${file.name}`;

    // 1. R2 へアップロード
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type || "image/jpeg",
      })
    );

    // 2. D1 の親テーブル補完 ＆ 画像レコード追加
    await queryD1(`INSERT OR IGNORE INTO shipping_orders (seq_no) VALUES (?)`, [seqNo]);

    const jstNow = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" });

    await queryD1(
      `INSERT INTO shipping_images (seq_no, file_name, original_name, mime_type, file_size, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [seqNo, fileName, file.name, file.type || "image/jpeg", file.size, jstNow]
    ).catch(async () => {
      await queryD1(
        `INSERT INTO shipping_images (seq_no, file_name, original_name, mime_type, file_size) VALUES (?, ?, ?, ?, ?)`,
        [seqNo, fileName, file.name, file.type || "image/jpeg", file.size]
      );
    });

    return NextResponse.json({ success: true, fileName });
  } catch (error: any) {
    console.error("❌ === [UPLOAD API] EXCEPTION ERROR ===", error);
    return NextResponse.json({ error: error?.message || "アップロード失敗" }, { status: 500 });
  }
}

// 画像の削除 (DELETE)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("file_name");

    if (!fileName) {
      return NextResponse.json({ error: "ファイル名が必要です" }, { status: 400 });
    }

    // 1. Cloudflare R2 から物理ファイルを削除
    if (process.env.R2_BUCKET_NAME) {
      await r2.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
        })
      );
    }

    // 2. Cloudflare D1 からレコードを削除
    await queryD1(`DELETE FROM shipping_images WHERE file_name = ?`, [fileName]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Image Error:", error);
    return NextResponse.json({ error: "画像の削除に失敗しました" }, { status: 500 });
  }
}