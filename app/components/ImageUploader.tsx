"use client";

import { useState, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { QRCodeCanvas } from "qrcode.react"; // 1. qrcode.react から QRCodeCanvas をインポート

type ImageRecord = {
  id: number;
  file_name: string;
  original_name: string;
  tracking_no: string;
  file_size: number;
  created_at: string;
};

export default function ImageUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  
  // 2. QRコードモーダル用の状態を追加
  const [qrValue, setQrValue] = useState<string | null>(null);

  // 一覧取得
  const fetchImages = async () => {
    try {
      const res = await fetch("/api/images");
      const data = await res.json();
      if (Array.isArray(data.images)) {
        setImages(data.images);
      } else {
        setImages([]);
      }
    } catch (err) {
      console.error("Failed to fetch images:", err);
      setImages([]);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  // アップロード処理
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/jpeg",
      };

      console.log(`圧縮前サイズ: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      const compressedFile = await imageCompression(file, options);
      console.log(`圧縮後サイズ: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

      const formData = new FormData();
      formData.append("file", compressedFile, file.name);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setFile(null);
        fetchImages();
      }
    } catch (error) {
      console.error("圧縮・アップロード失敗:", error);
    } finally {
      setUploading(false);
    }
  };

  // プレビュー取得処理
  const handlePreview = async (key: string) => {
    const res = await fetch(`/api/image-url?key=${encodeURIComponent(key)}`);
    const data = await res.json();
    if (data.url) setSelectedImageUrl(data.url);
  };

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <div className="p-4 border rounded-lg space-y-3">
        <h2 className="text-lg font-bold">画像アップロード（自動圧縮付き）</h2>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
        >
          {uploading ? "圧縮＆送信中..." : "アップロード"}
        </button>
      </div>

      {/* プレビュー表示エリア */}
      {selectedImageUrl && (
        <div className="p-4 border rounded-lg">
          <h3 className="font-bold mb-2">選択中の画像プレビュー</h3>
          <img src={selectedImageUrl} alt="Preview" className="max-h-64 rounded" />
        </div>
      )}

      {/* D1 データ一覧テーブル */}
      <div className="p-4 border rounded-lg">
        <h2 className="text-lg font-bold mb-3">登録済み画像一覧 (D1)</h2>
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-2">ID</th>
              <th className="p-2">ファイル名</th>
              <th className="p-2">サイズ</th>
              <th className="p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {images.map((img) => (
              <tr key={img.id} className="border-b">
                <td className="p-2">{img.id}</td>
                <td className="p-2">{img.original_name}</td>
                <td className="p-2">{(img.file_size / 1024 / 1024).toFixed(2)} MB</td>
                <td className="p-2 space-x-3">
                  <button
                    onClick={() => handlePreview(img.file_name)}
                    className="text-blue-500 underline"
                  >
                    表示
                  </button>

                  {/* 3. QRコード表示用ボタンを追加 */}
                  <button
                    onClick={() => setQrValue(img.tracking_no || img.file_name)}
                    className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-500"
                  >
                    QRコード
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. QRコードモーダルダイアログ */}
      {qrValue && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full text-center shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">登録情報 QRコード</h3>
            
            <div className="bg-white p-4 rounded-md inline-block mb-4">
              <QRCodeCanvas
                value={qrValue}
                size={200}
                level={"H"}
                includeMargin={true}
              />
            </div>

            <p className="text-xs text-zinc-400 break-all mb-6 font-mono">{qrValue}</p>

            <button
              onClick={() => setQrValue(null)}
              className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded transition"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
