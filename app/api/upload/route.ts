import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";
import { queryD1 } from "@/lib/d1";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const trackingNo = (formData.get("trackingNo") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}_${file.name}`;

    // 1. Cloudflare R2 へアップロード
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || "shipping-images",
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    });

    await r2Client.send(command);

    // 2. Cloudflare D1 にレコードを保存
    await queryD1(
      `INSERT INTO shipping_images (file_name, original_name, tracking_no, mime_type, file_size) VALUES (?, ?, ?, ?, ?)`,
      [fileName, file.name, trackingNo, file.type, file.size]
    );

    return NextResponse.json({
      success: true,
      fileName,
      message: "R2への保存およびD1へのメタデータ登録が完了しました",
    });
  } catch (error) {
    console.error("Upload & D1 Error:", error);
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }
}
