"use client";

import { useState, useEffect } from "react";
import imageCompression from "browser-image-compression"; // 1. ライブラリをインポート

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
      // 2. 圧縮オプションの設定
      const options = {
        maxSizeMB: 1,            // 最大ファイルサイズ (例: 1MB以下に抑える)
        maxWidthOrHeight: 1920,   // 画像の最大幅/高さ (長辺を1920pxにリサイズ)
        useWebWorker: true,      // バックグラウンドで高速処理
        fileType: "image/jpeg",  // 圧縮後のフォーマット
      };

      console.log(`圧縮前サイズ: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

      // 3. 画像の圧縮実行
      const compressedFile = await imageCompression(file, options);

      console.log(`圧縮後サイズ: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

      // 4. 圧縮後のファイルを FormData にセットして送信
      const formData = new FormData();
      formData.append("file", compressedFile, file.name); // 元のファイル名を維持

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setFile(null);
        fetchImages(); // 一覧を更新
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
                <td className="p-2">
                  <button
                    onClick={() => handlePreview(img.file_name)}
                    className="text-blue-500 underline"
                  >
                    表示
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
