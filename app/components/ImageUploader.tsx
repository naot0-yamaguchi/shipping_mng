"use client";

import { useState } from "react";

export default function ImageUploader() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("アップロード中...");
    setImageUrl(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. 画像のアップロード
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`成功: ${data.fileName}`);

        // 2. 署名付きURLの取得
        const urlRes = await fetch(`/api/image-url?key=${encodeURIComponent(data.fileName)}`);
        const urlData = await urlRes.json();

        if (urlRes.ok && urlData.url) {
          setImageUrl(urlData.url);
        }
      } else {
        setMessage(`エラー: ${data.error}`);
      }
    } catch (err) {
      setMessage("通信エラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg max-w-md my-4">
      <h3 className="text-lg font-bold mb-2">画像アップロード（R2テスト）</h3>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {message && <p className="mt-2 text-sm font-medium">{message}</p>}

      {/* アップロード成功後のプレビュー表示 */}
      {imageUrl && (
        <div className="mt-4">
          <p className="text-sm font-bold mb-1">プレビュー表示（署名付きURL）:</p>
          <img
            src={imageUrl}
            alt="Uploaded Preview"
            className="w-full h-auto rounded border"
          />
        </div>
      )}
    </div>
  );
}
