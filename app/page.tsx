"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import imageCompression from "browser-image-compression";
import { Html5Qrcode } from "html5-qrcode";
import QuickPinchZoom, { make3dTransformValue } from "react-quick-pinch-zoom";

type ImageItem = {
  id?: number;
  file_name: string;
  original_name: string;
  previewUrl?: string;
};

type Customer = {
  id: number;
  name: string;
};

export default function ShippingManagementApp() {
  const [mode, setMode] = useState<"scanner" | "detail">("scanner");
  const [seqNo, setSeqNo] = useState<string>("");

  // 詳細画面用ステート
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [fedexTrackingNo, setFedexTrackingNo] = useState<string>("");
  const [images, setImages] = useState<ImageItem[]>([]);

  // 顧客補完用ステート
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // 画像ズーム・モーダル用ステート
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  // ステータス・UI用
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // カメラ・スキャナー・Zoom DOM ref
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // ズーム操作用コールバック
  const onUpdateZoom = useCallback(({ x, y, scale }: { x: number; y: number; scale: number }) => {
    const { current: img } = imgRef;
    if (img) {
      const value = make3dTransformValue({ x, y, scale });
      img.style.setProperty("transform", value);
    }
  }, []);

  // ----------------------------------------------------
  // QRスキャナー制御
  // ----------------------------------------------------
  const startScanner = async () => {
    setIsScanning(true);
    setMessage("");

    setTimeout(async () => {
      try {
        const readerElement = document.getElementById("reader");
        if (!readerElement) {
          setMessage("エラー: QRリーダー要素が見つかりません");
          setIsScanning(false);
          return;
        }

        const html5Qrcode = new Html5Qrcode("reader");
        html5QrcodeRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            let extractedSeq = decodedText;
            try {
              const url = new URL(decodedText);
              const param = url.searchParams.get("seq");
              if (param) extractedSeq = param;
            } catch (e) {}

            stopScanner();
            handleSelectSeq(extractedSeq);
          },
          () => {}
        );
      } catch (err: any) {
        console.error(err);
        setMessage(`カメラ起動エラー: ${err?.name || ""} - ${err?.message || JSON.stringify(err)}`);
        setIsScanning(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      await html5QrcodeRef.current.stop();
      html5QrcodeRef.current = null;
    }
    setIsScanning(false);
  };

  // ----------------------------------------------------
  // シーケンス詳細データロード
  // ----------------------------------------------------
  const handleSelectSeq = async (targetSeq: string) => {
    setSeqNo(targetSeq);
    setLoading(true);
    setMode("detail");
    setMessage("");
    setPreviewIndex(null);

    try {
      const res = await fetch(`/api/shipping?seq=${encodeURIComponent(targetSeq)}`);
      const data = await res.json();

      if (res.ok) {
        setIsLocked(data.isLocked);
        setCustomerName(data.order?.customer_name || "");
        setFedexTrackingNo(data.order?.fedex_tracking_no || "");
        const fetchedImages: ImageItem[] = data.images || [];
        setImages(fetchedImages);
        fetchedImages.forEach((img) => fetchPreviewUrl(img.file_name));
      } else {
        setMessage("データ読込エラー");
      }
    } catch (e) {
      setMessage("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 顧客一覧検索
  const fetchCustomers = async (query: string = "") => {
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.customers) {
        setCustomerSuggestions(data.customers);
        setShowSuggestions(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 新規顧客追加
  const handleAddCustomer = async () => {
    if (!customerName.trim()) return;
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: customerName }),
    });
    if (res.ok) {
      setMessage(`顧客「${customerName}」を新規登録しました`);
      setShowSuggestions(false);
    }
  };

  // ----------------------------------------------------
  // 複数画像自動圧縮＆即時プレビュー・アップロード
  // ----------------------------------------------------
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || isLocked) return;

    setUploading(true);
    setMessage("画像を圧縮・保存中...");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });

        const localBlobUrl = URL.createObjectURL(compressed);

        const formData = new FormData();
        formData.append("file", compressed, file.name);
        formData.append("seq_no", seqNo);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await res.json();

        if (res.ok) {
          const newImgItem: ImageItem = {
            file_name: uploadData.fileName || file.name,
            original_name: file.name,
            previewUrl: localBlobUrl,
          };

          setImages((prev) => [...prev, newImgItem]);
          setPreviewUrls((prev) => ({
            ...prev,
            [newImgItem.file_name]: localBlobUrl,
          }));
        }
      } catch (err) {
        console.error("画像アップロード失敗:", err);
      }
    }

    setUploading(false);
    setMessage("画像を追加しました");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 画像URL取得
  const fetchPreviewUrl = async (key: string) => {
    if (previewUrls[key]) return previewUrls[key];
    try {
      const res = await fetch(`/api/image-url?key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (data.url) {
        setPreviewUrls((prev) => ({ ...prev, [key]: data.url }));
        return data.url;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  // 出荷情報の保存
  const handleSaveOrder = async () => {
    if (!seqNo) return;
    setLoading(true);

    try {
      const res = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seq_no: seqNo,
          customer_name: customerName,
          fedex_tracking_no: fedexTrackingNo,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`シーケンス「${seqNo}」の情報を保存しました`);
        setMode("scanner");
        setSeqNo("");
        setCustomerName("");
        setFedexTrackingNo("");
        setImages([]);
      } else {
        setMessage(data.error || "保存に失敗しました");
      }
    } catch (e) {
      setMessage("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 max-w-lg mx-auto overscroll-y-contain touch-manipulation">
      {/* ヘッダーナビ */}
      <header className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-black text-amber-500 tracking-wider">TMS APP</h1>
        {mode === "detail" && (
          <button
            onClick={() => setMode("scanner")}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full text-zinc-300 transition"
          >
            ← スキャン画面へ戻る
          </button>
        )}
      </header>

      {/* 通知メッセージ */}
      {message && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-lg animate-pulse">
          {message}
        </div>
      )}

      {/* スキャン画面 */}
      {mode === "scanner" && (
        <div className="space-y-6 text-center py-6">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold">荷物スキャン</h2>
            <p className="text-xs text-zinc-400">QRコードを読み取って商品情報を登録・確認します</p>

            {!isScanning ? (
              <button
                onClick={startScanner}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 text-base transition active:scale-95"
              >
                📷 QRコードリーダー起動
              </button>
            ) : (
              <div className="space-y-3">
                <div id="reader" className="overflow-hidden rounded-xl border-2 border-amber-500 bg-black"></div>
                <button
                  onClick={stopScanner}
                  className="w-full py-2 bg-zinc-800 text-zinc-400 text-xs rounded-lg"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>

          <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl space-y-2 text-left">
            <label className="text-xs text-zinc-500">直接シーケンス指定（テスト用）</label>
            <input
              type="text"
              placeholder="例: SEQ001"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value) {
                  handleSelectSeq(e.currentTarget.value);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* 詳細画面 */}
      {mode === "detail" && (
        <div className="space-y-4">
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">対象シーケンス</span>
            <span className="text-xl font-black font-mono text-amber-400">{seqNo}</span>
          </div>

          <div className="flex items-center justify-between px-1 pt-2">
            <span className="text-xs font-bold text-zinc-400 tracking-wider">登録・編集情報</span>
            {isLocked ? (
              <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-full">
                🔒 閲覧のみ (追跡番号登録済み)
              </span>
            ) : (
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full">
                ✏️ 以下の項目は編集可能
              </span>
            )}
          </div>

          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-5 shadow-xl">
            {/* ① お客様名 */}
            <div className="relative space-y-1">
              <label className="text-xs font-bold text-zinc-300">お客様名</label>
              <input
                type="text"
                disabled={isLocked}
                value={customerName}
                onFocus={() => fetchCustomers(customerName)}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  fetchCustomers(e.target.value);
                }}
                placeholder="フォーカスで顧客候補を表示"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500 disabled:bg-zinc-800/40 disabled:text-zinc-500"
              />

              {!isLocked && showSuggestions && (
                <div className="absolute top-full left-0 right-0 z-30 bg-zinc-800 border border-zinc-700 rounded-lg mt-1 shadow-2xl max-h-48 overflow-y-auto">
                  {customerSuggestions.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setCustomerName(c.name);
                        setShowSuggestions(false);
                      }}
                      className="p-3 text-sm hover:bg-zinc-700 cursor-pointer border-b border-zinc-700/50 last:border-0"
                    >
                      {c.name}
                    </div>
                  ))}

                  {customerName.trim() && (
                    <div
                      onClick={handleAddCustomer}
                      className="p-3 text-xs text-amber-400 font-bold hover:bg-zinc-700 cursor-pointer bg-zinc-900/90"
                    >
                      ＋ 「{customerName}」を新規顧客として登録
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ② FEDEX Tracking No. */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">
                FEDEX Tracking No.
                {!isLocked && <span className="text-rose-400 text-xs ml-1">※登録すると編集不可になります</span>}
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={fedexTrackingNo}
                onChange={(e) => setFedexTrackingNo(e.target.value)}
                placeholder="追跡番号を入力 (例: 7783XXXXXX)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm font-mono focus:outline-none focus:border-amber-500 disabled:bg-zinc-800/40 disabled:text-zinc-500"
              />
            </div>

            {/* ③ 商品画像 */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-300">商品画像 (登録件数: {images.length}枚)</label>
              </div>

              {!isLocked && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    disabled={uploading}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                  >
                    📷 {uploading ? "写真を追加・圧縮中..." : "写真を追加・撮影（複数可）"}
                  </button>
                </div>
              )}

              {/* サムネイル一覧 */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {images.map((img, idx) => {
                  const src = img.previewUrl || previewUrls[img.file_name];
                  return (
                    <div
                      key={img.id || idx}
                      onClick={() => {
                        if (img.file_name) fetchPreviewUrl(img.file_name);
                        setPreviewIndex(idx);
                      }}
                      className="aspect-square bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden cursor-pointer relative group flex items-center justify-center"
                    >
                      {src ? (
                        <img
                          src={src}
                          alt={img.original_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      ) : (
                        <span className="text-[10px] text-zinc-500 p-1 text-center">読み込み中...</span>
                      )}
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ④ アクションボタン */}
            {!isLocked && (
              <button
                onClick={handleSaveOrder}
                disabled={loading || uploading}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:bg-zinc-700 disabled:text-zinc-500"
              >
                {loading ? "保存中..." : "情報を保存して次のスキャンへ"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ピンチイン・ピンチアウト（指ズーム）対応モーダル       */}
      {/* ======================================================== */}
      {previewIndex !== null && images[previewIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 backdrop-blur-md">
          {/* ヘッダー */}
          <div className="flex justify-between items-center text-zinc-300 z-10">
            <span className="text-xs font-bold text-amber-400">
              画像 {previewIndex + 1} / {images.length} (ピンチで拡大可能)
            </span>
            <button
              onClick={() => setPreviewIndex(null)}
              className="px-3 py-1 bg-zinc-800 text-white rounded-full text-xs hover:bg-zinc-700 font-bold"
            >
              ✕ 閉じる
            </button>
          </div>

          {/* ズーム領域 */}
          <div className="flex-1 w-full h-full my-2 overflow-hidden flex items-center justify-center">
            {images[previewIndex].previewUrl || previewUrls[images[previewIndex].file_name] ? (
              <QuickPinchZoom onUpdate={onUpdateZoom} maxZoom={5}>
                <img
                  ref={imgRef}
                  src={images[previewIndex].previewUrl || previewUrls[images[previewIndex].file_name]}
                  alt="Zoom Preview"
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
                />
              </QuickPinchZoom>
            ) : (
              <span className="text-zinc-400 text-xs">高画質画像をロード中...</span>
            )}
          </div>

          {/* フッターナビ */}
          <div className="flex justify-between items-center gap-4 z-10">
            <button
              disabled={previewIndex === 0}
              onClick={() => setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
              className="flex-1 py-3 bg-zinc-800 text-white text-xs font-bold rounded-xl disabled:opacity-30 disabled:pointer-events-none"
            >
              ← 前の画像
            </button>
            <button
              disabled={previewIndex === images.length - 1}
              onClick={() =>
                setPreviewIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : prev))
              }
              className="flex-1 py-3 bg-zinc-800 text-white text-xs font-bold rounded-xl disabled:opacity-30 disabled:pointer-events-none"
            >
              次の画像 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}