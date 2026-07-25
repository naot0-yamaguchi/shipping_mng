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
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const seqNo = (formData.get("seq_no") as string) || "UNKNOWN";

    if (!file) {
      return NextResponse.json({ error: "ファイルが指定されていません" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}_${file.name}`;

    // 1. Cloudflare R2 に保存
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // 2. Cloudflare D1 に追記（一意なIDで毎回新規レコード追加）
    await queryD1(
      `INSERT INTO shipping_images (seq_no, file_name, original_name, mime_type, file_size) VALUES (?, ?, ?, ?, ?)`,
      [seqNo, fileName, file.name, file.type, file.size]
    );

    return NextResponse.json({ success: true, fileName });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "アップロード失敗" }, { status: 500 });
  }
}