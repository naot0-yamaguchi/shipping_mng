"use client";

import { useState, useEffect, useRef } from "react";
import imageCompression from "browser-image-compression";
import { Html5Qrcode } from "html5-qrcode";

type ImageItem = {
  id: number;
  file_name: string;
  original_name: string;
};

type Customer = {
  id: number;
  name: string;
};

export default function ShippingManagementApp() {
  // 画面モード: scanner (QRスキャン画面) | detail (情報入力・表示画面)
  const [mode, setMode] = useState<"scanner" | "detail">("scanner");
  const [seqNo, setSeqNo] = useState<string>("");

  // 詳細画面用ステート
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [fedexTrackingNo, setFedexTrackingNo] = useState<string>("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  // 顧客補完用ステート
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // ステータス・UI用
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // カメラ・スキャナー管理
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // ----------------------------------------------------
  // QRスキャナー制御
  // ----------------------------------------------------
  const startScanner = async () => {
    // 1. スキャナ表示フラグをオンにする
    setIsScanning(true);
    setMessage("");

    // 2. Reactの再描画（DOM生成）を待つために setTimeout で1周送る
    setTimeout(async () => {
      try {
        const readerElement = document.getElementById("reader");
        if (!readerElement) {
          setMessage("エラー: QRリーダーの表示要素が見つかりません。");
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
    }, 100); // 100ms 待つことで確実に <div id="reader"> が生成されます
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
    setSelectedPreview(null);

    try {
      const res = await fetch(`/api/shipping?seq=${encodeURIComponent(targetSeq)}`);
      const data = await res.json();

      if (res.ok) {
        setIsLocked(data.isLocked);
        setCustomerName(data.order?.customer_name || "");
        setFedexTrackingNo(data.order?.fedex_tracking_no || "");
        setImages(data.images || []);
      } else {
        setMessage("データ読込エラー");
      }
    } catch (e) {
      setMessage("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 顧客インクリメンタル検索
  // ----------------------------------------------------
  useEffect(() => {
    if (isLocked || !customerName.trim()) {
      setCustomerSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(customerName)}`);
      const data = await res.json();
      if (data.customers) {
        setCustomerSuggestions(data.customers);
        setShowSuggestions(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerName, isLocked]);

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
  // 複数画像自動圧縮＆アップロード
  // ----------------------------------------------------
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || isLocked) return;

    setUploading(true);
    setMessage("画像を圧縮・アップロード中...");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });

        const formData = new FormData();
        formData.append("file", compressed, file.name);
        formData.append("seq_no", seqNo);

        await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
      } catch (err) {
        console.error("画像アップロード失敗:", err);
      }
    }

    setUploading(false);
    setMessage("画像のアップロードが完了しました");
    handleSelectSeq(seqNo); // 一覧再取得
  };

  // 画像プレビューURL取得
  const handlePreviewImage = async (key: string) => {
    const res = await fetch(`/api/image-url?key=${encodeURIComponent(key)}`);
    const data = await res.json();
    if (data.url) setSelectedPreview(data.url);
  };

  // ----------------------------------------------------
  // 出荷情報の保存・確定
  // ----------------------------------------------------
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
        setMessage("保存しました");
        handleSelectSeq(seqNo); // ロック状態などを再読み込み
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 max-w-lg mx-auto">
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

      {/* ======================================================== */}
      {/* 1. QRコード読み取り画面 (スキャナー)                       */}
      {/* ======================================================== */}
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

          {/* テスト用手入力 */}
          <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl space-y-2 text-left">
            <label className="text-xs text-zinc-500">直接シーケンス指定（テスト用）</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="例: SEQ001"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value) {
                    handleSelectSeq(e.currentTarget.value);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. QRコード情報表示・登録画面                            */}
      {/* ======================================================== */}
      {mode === "detail" && (
        <div className="space-y-5">
          {/* シーケンス・ステータスバー */}
          <div className="flex justify-between items-center p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div>
              <span className="text-xs text-zinc-500 block">シーケンス番号</span>
              <span className="text-xl font-extrabold font-mono text-amber-400">{seqNo}</span>
            </div>
            <div>
              {isLocked ? (
                <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-full">
                  🔒 閲覧のみ (ロック済み)
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full">
                  ✏️ 編集可能
                </span>
              )}
            </div>
          </div>

          {/* フォーム領域 */}
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-5 shadow-xl">
            {/* ① お客さんの名前 (サジェスト機能付き) */}
            <div className="relative space-y-1">
              <label className="text-xs font-bold text-zinc-300">お客様名</label>
              <input
                type="text"
                disabled={isLocked}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="顧客名を入力（例: 山口 直人）"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500 disabled:bg-zinc-800/40 disabled:text-zinc-500"
              />

              {/* 顧客サジェストドロップダウン */}
              {!isLocked && showSuggestions && customerName.trim() && (
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

                  {/* 一致する顧客がない場合の新規追加ボタン */}
                  <div
                    onClick={handleAddCustomer}
                    className="p-3 text-xs text-amber-400 font-bold hover:bg-zinc-700 cursor-pointer bg-zinc-800/80"
                  >
                    ＋ 「{customerName}」を新規顧客として登録
                  </div>
                </div>
              )}
            </div>

            {/* ② FEDEX Tracking No. */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">
                FEDEX Tracking No.
                {!isLocked && <span className="text-rose-400 text-xs ml-1">※入力・保存で編集不可になります</span>}
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

            {/* ③ 中の商品の画像（複数対応） */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-300">商品画像（複数可能）</label>
                <span className="text-xs text-zinc-500">{images.length} 件</span>
              </div>

              {!isLocked && (
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={uploading}
                  onChange={handleImageUpload}
                  className="block w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20"
                />
              )}

              {/* 画像サムネイルグリッド */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => handlePreviewImage(img.file_name)}
                    className="aspect-square bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden flex items-center justify-center text-xs text-zinc-400 hover:border-amber-500 transition relative"
                  >
                    <span className="p-1 text-[10px] break-all line-clamp-2">{img.original_name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 画像拡大プレビュー表示 */}
            {selectedPreview && (
              <div className="p-3 bg-black border border-zinc-700 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>プレビュー</span>
                  <button onClick={() => setSelectedPreview(null)} className="text-rose-400">✕ 閉じる</button>
                </div>
                <img src={selectedPreview} alt="Preview" className="w-full h-auto rounded-lg max-h-64 object-contain" />
              </div>
            )}

            {/* ④ アクションボタン */}
            {!isLocked && (
              <button
                onClick={handleSaveOrder}
                disabled={loading || uploading}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:bg-zinc-700 disabled:text-zinc-500"
              >
                {loading ? "保存中..." : "情報を保存・更新する"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}