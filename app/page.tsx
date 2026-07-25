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

type Language = "ja" | "en" | "th";

// ----------------------------------------------------
// i18n 辞書定義
// ----------------------------------------------------
const dictionary = {
  ja: {
    title: "TMS APP",
    backToScanner: "← スキャン画面へ戻る",
    scanHeader: "荷物スキャン",
    scanDesc: "QRコードを読み取るか、追跡番号から検索します",
    startScanner: "📷 QRコードリーダー起動",
    cancel: "キャンセル",
    searchBySeq: "直接シーケンス指定（テスト用）",
    searchByFedex: "FEDEX Tracking No. で検索",
    searchBtn: "検索",
    seqLabel: "対象シーケンス",
    editHeader: "登録・編集情報",
    readOnlyStatus: "🔒 閲覧のみ (追跡番号登録済み)",
    editableStatus: "✏️ 以下の項目は編集可能",
    customerName: "お客様名",
    customerPlaceholder: "フォーカスで顧客候補を表示",
    addCustomerPrefix: "＋ 新規顧客として登録: ",
    fedexLabel: "FEDEX Tracking No.",
    fedexWarning: "※登録すると編集不可になります",
    fedexPlaceholder: "追跡番号を入力 (例: 7783XXXXXX)",
    imagesLabel: "商品画像",
    imgCount: "登録件数: {count}枚",
    addPhotosBtn: "📷 写真を追加・撮影（複数可）",
    compressing: "写真を追加・圧縮中...",
    saveBtn: "情報を保存して次のスキャンへ",
    saving: "保存中...",
    close: "✕ 閉じる",
    tapBackgroundToClose: "※背景タップでも閉じます",
    prevImg: "← 前の画像",
    nextImg: "次の画像 →",
    imgProgress: "画像 {current} / {total}",
    uploadingMsg: "画像を圧縮・送信中...",
    uploadSuccess: "画像を追加しました",
    saveSuccess: "シーケンス「{seq}」の情報を保存しました",
    scanError: "カメラ起動エラー",
    dataError: "データ読込エラー",
    networkError: "通信エラーが発生しました",
  },
  en: {
    title: "TMS APP",
    backToScanner: "← Back to Scanner",
    scanHeader: "Package Scan",
    scanDesc: "Scan QR code or search by FEDEX Tracking No.",
    startScanner: "📷 Start QR Scanner",
    cancel: "Cancel",
    searchBySeq: "Direct Sequence Spec (Test)",
    searchByFedex: "Search by FEDEX Tracking No.",
    searchBtn: "Search",
    seqLabel: "Target Sequence",
    editHeader: "Registration & Edit Info",
    readOnlyStatus: "🔒 Read Only (Tracking Registered)",
    editableStatus: "✏️ Items below are editable",
    customerName: "Customer Name",
    customerPlaceholder: "Focus to show candidates",
    addCustomerPrefix: "＋ Register as new customer: ",
    fedexLabel: "FEDEX Tracking No.",
    fedexWarning: "※ Locked after saving",
    fedexPlaceholder: "Enter Tracking No (e.g. 7783XXXXXX)",
    imagesLabel: "Product Images",
    imgCount: "Total: {count} photo(s)",
    addPhotosBtn: "📷 Add / Take Photos",
    compressing: "Compressing & Uploading...",
    saveBtn: "Save Information & Next Scan",
    saving: "Saving...",
    close: "✕ Close",
    tapBackgroundToClose: "※ Tap background to close",
    prevImg: "← Previous",
    nextImg: "Next →",
    imgProgress: "Image {current} / {total}",
    uploadingMsg: "Compressing and uploading images...",
    uploadSuccess: "Image(s) added successfully",
    saveSuccess: "Saved sequence '{seq}' successfully",
    scanError: "Camera Start Error",
    dataError: "Data Load Error",
    networkError: "Network connection error",
  },
  th: {
    title: "TMS APP",
    backToScanner: "← กลับสู่หน้าสแกน",
    scanHeader: "สแกนพัสดุ",
    scanDesc: "สแกน QR Code หรือค้นหาด้วยหมายเลข FEDEX",
    startScanner: "📷 เปิดตัวสแกน QR Code",
    cancel: "ยกเลิก",
    searchBySeq: "ระบุ Sequence โดยตรง (ทดสอบ)",
    searchByFedex: "ค้นหาด้วยหมายเลข FEDEX Tracking",
    searchBtn: "ค้นหา",
    seqLabel: "Sequence เป้าหมาย",
    editHeader: "ข้อมูลการลงทะเบียนและแก้ไข",
    readOnlyStatus: "🔒 อ่านอย่างเดียว (ลงทะเบียนพัสดุแล้ว)",
    editableStatus: "✏️ รายการด้านล่างสามารถแก้ไขได้",
    customerName: "ชื่อลูกค้า",
    customerPlaceholder: "แตะเพื่อแสดงรายชื่อลูกค้า",
    addCustomerPrefix: "＋ ลงทะเบียนเป็นลูกค้าใหม่: ",
    fedexLabel: "FEDEX Tracking No.",
    fedexWarning: "※ ไม่สามารถแก้ไขได้หลังจากบันทึก",
    fedexPlaceholder: "กรอกหมายเลข Tracking (เช่น 7783XXXXXX)",
    imagesLabel: "รูปภาพสินค้า",
    imgCount: "จำนวนที่ลงทะเบียน: {count} ภาพ",
    addPhotosBtn: "📷 เพิ่ม / ถ่ายภาพ (หลายภาพได้)",
    compressing: "กำลังบีบอัดและอัปโหลด...",
    saveBtn: "บันทึกข้อมูลและไปสแกนถัดไป",
    saving: "กำลังบันทึก...",
    close: "✕ ปิด",
    tapBackgroundToClose: "※ แตะพื้นที่ว่างเพื่อปิด",
    prevImg: "← ภาพก่อนหน้า",
    nextImg: "ภาพถัดไป →",
    imgProgress: "ภาพที่ {current} / {total}",
    uploadingMsg: "กำลังบีบอัดและส่งรูปภาพ...",
    uploadSuccess: "เพิ่มรูปภาพเรียบร้อยแล้ว",
    saveSuccess: "บันทึกข้อมูล Sequence '{seq}' เรียบร้อยแล้ว",
    scanError: "เกิดข้อผิดพลาดในการเปิดกล้อง",
    dataError: "เกิดข้อผิดพลาดในการโหลดข้อมูล",
    networkError: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
  },
};

export default function ShippingManagementApp() {
  const [lang, setLang] = useState<Language>("ja");
  const t = dictionary[lang];

  const [mode, setMode] = useState<"scanner" | "detail">("scanner");
  const [seqNo, setSeqNo] = useState<string>("");
  const [fedexSearchInput, setFedexSearchInput] = useState<string>("");

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

  // Ref
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
        setMessage(`${t.scanError}: ${err?.message || ""}`);
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
  // シーケンス詳細データロード（Seq または FEDEX No）
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
        setMessage(t.dataError);
      }
    } catch (e) {
      setMessage(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  // FEDEX Tracking No で直接検索する処理
  const handleSearchByFedex = async () => {
    if (!fedexSearchInput.trim()) return;
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/shipping?fedex=${encodeURIComponent(fedexSearchInput.trim())}`);
      const data = await res.json();

      if (res.ok && data.seqNo) {
        handleSelectSeq(data.seqNo);
      } else {
        setMessage(t.dataError);
      }
    } catch (e) {
      setMessage(t.networkError);
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
      setShowSuggestions(false);
    }
  };

  // ----------------------------------------------------
  // デバッグログ付き 画像アップロード処理
  // ----------------------------------------------------
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log("📸 [Frontend] File input triggered. Files length:", files?.length);

    if (!files || files.length === 0 || isLocked) {
      console.log("📸 [Frontend] Upload skipped (no files or locked)");
      return;
    }

    setUploading(true);
    setMessage("画像を処理中...");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📸 [Frontend] Processing file #${i + 1}:`, file.name, `(${file.size} bytes)`);

      try {
        // ① 圧縮開始
        console.log("📸 [Frontend] Starting compression...");
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        console.log("📸 [Frontend] Compression complete. Compressed size:", compressed.size);

        // ② Blob URL生成
        const localBlobUrl = URL.createObjectURL(compressed);
        console.log("📸 [Frontend] Local Blob URL created:", localBlobUrl);

        // ③ FormData作成
        const formData = new FormData();
        formData.append("file", compressed, file.name);
        formData.append("seq_no", seqNo);

        // ④ Fetch送信
        console.log("📸 [Frontend] Sending fetch request to /api/upload...");
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        console.log("📸 [Frontend] Response status:", res.status, res.statusText);
        const uploadData = await res.json();
        console.log("📸 [Frontend] Response JSON:", uploadData);

        if (res.ok) {
          const newImgItem: ImageItem = {
            file_name: uploadData.fileName || file.name,
            original_name: file.name,
            previewUrl: localBlobUrl,
          };

          setImages((prev) => {
            const updated = [...prev, newImgItem];
            console.log("📸 [Frontend] Updated images state count:", updated.length);
            return updated;
          });

          setPreviewUrls((prev) => ({
            ...prev,
            [newImgItem.file_name]: localBlobUrl,
          }));

          setMessage(`✅ [${i + 1}/${files.length}] アップロード成功: ${file.name}`);
        } else {
          console.error("📸 [Frontend] API Returned Error:", uploadData);
          setMessage(`❌ サーバーエラー: ${uploadData.error || "失敗しました"}`);
        }
      } catch (err: any) {
        console.error("📸 [Frontend] Exception during upload:", err);
        setMessage(`❌ 例外エラー: ${err?.message || JSON.stringify(err)}`);
      }
    }

    setUploading(false);
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
        setMessage(t.saveSuccess.replace("{seq}", seqNo));
        setMode("scanner");
        setSeqNo("");
        setCustomerName("");
        setFedexTrackingNo("");
        setImages([]);
      } else {
        setMessage(data.error || t.dataError);
      }
    } catch (e) {
      setMessage(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 w-full box-border overscroll-y-contain touch-manipulation overflow-x-hidden">
      <div className="max-w-md mx-auto w-full">
        {/* ヘッダーナビ & 言語切り替え */}
        <header className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-3">
          <h1 className="text-xl font-black text-amber-500 tracking-wider">{t.title}</h1>
          <div className="flex items-center gap-2">
            {/* 言語セレクター */}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="bg-zinc-800 text-xs text-amber-400 font-bold border border-zinc-700 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="ja">日本語</option>
              <option value="en">English</option>
              <option value="th">ไทย</option>
            </select>

            {mode === "detail" && (
              <button
                onClick={() => setMode("scanner")}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-full text-zinc-300 transition"
              >
                {t.backToScanner}
              </button>
            )}
          </div>
        </header>

        {/* 通知メッセージ */}
        {message && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-lg animate-pulse">
            {message}
          </div>
        )}

        {/* スキャン画面 */}
        {mode === "scanner" && (
          <div className="space-y-6 text-center py-4 w-full">
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl space-y-4 w-full box-border">
              <h2 className="text-lg font-bold">{t.scanHeader}</h2>
              <p className="text-xs text-zinc-400">{t.scanDesc}</p>

              {!isScanning ? (
                <button
                  onClick={startScanner}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 text-base transition active:scale-95"
                >
                  {t.startScanner}
                </button>
              ) : (
                <div className="space-y-3 w-full">
                  <div id="reader" className="overflow-hidden rounded-xl border-2 border-amber-500 bg-black w-full"></div>
                  <button
                    onClick={stopScanner}
                    className="w-full py-2 bg-zinc-800 text-zinc-400 text-xs rounded-lg"
                  >
                    {t.cancel}
                  </button>
                </div>
              )}
            </div>

            {/* FEDEX 追跡番号での検索フォーム */}
            <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl space-y-2 text-left w-full box-border">
              <label className="text-xs text-zinc-400 font-bold">{t.searchByFedex}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fedexSearchInput}
                  onChange={(e) => setFedexSearchInput(e.target.value)}
                  placeholder="例: 7783XXXXXX"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 font-mono box-border"
                />
                <button
                  onClick={handleSearchByFedex}
                  disabled={loading}
                  className="px-4 py-2 bg-amber-500 text-zinc-950 font-bold text-xs rounded-lg hover:bg-amber-400 active:scale-95"
                >
                  {t.searchBtn}
                </button>
              </div>
            </div>

            {/* 直接シーケンス指定 */}
            <div className="p-4 bg-zinc-900/30 border border-zinc-800/30 rounded-xl space-y-2 text-left w-full box-border">
              <label className="text-xs text-zinc-500">{t.searchBySeq}</label>
              <input
                type="text"
                placeholder="例: SEQ001"
                className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 box-border"
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
          <div className="space-y-4 w-full">
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between w-full box-border">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">{t.seqLabel}</span>
              <span className="text-xl font-black font-mono text-amber-400">{seqNo}</span>
            </div>

            <div className="flex items-center justify-between px-1 pt-2">
              <span className="text-xs font-bold text-zinc-400 tracking-wider">{t.editHeader}</span>
              {isLocked ? (
                <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-full">
                  {t.readOnlyStatus}
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full">
                  {t.editableStatus}
                </span>
              )}
            </div>

            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-5 shadow-xl w-full box-border">
              {/* ① お客様名 */}
              <div className="relative space-y-1">
                <label className="text-xs font-bold text-zinc-300">{t.customerName}</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={customerName}
                  onFocus={() => fetchCustomers(customerName)}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    fetchCustomers(e.target.value);
                  }}
                  placeholder={t.customerPlaceholder}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500 disabled:bg-zinc-800/40 disabled:text-zinc-500 box-border"
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
                        {t.addCustomerPrefix} 「{customerName}」
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ② FEDEX Tracking No. */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">
                  {t.fedexLabel}
                  {!isLocked && <span className="text-rose-400 text-xs ml-1">{t.fedexWarning}</span>}
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={fedexTrackingNo}
                  onChange={(e) => setFedexTrackingNo(e.target.value)}
                  placeholder={t.fedexPlaceholder}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm font-mono focus:outline-none focus:border-amber-500 disabled:bg-zinc-800/40 disabled:text-zinc-500 box-border"
                />
              </div>

              {/* ③ 商品画像 */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-300">
                    {t.imagesLabel} ({t.imgCount.replace("{count}", String(images.length))})
                  </label>
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
                      {uploading ? t.compressing : t.addPhotosBtn}
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
                          <span className="text-[10px] text-zinc-500 p-1 text-center">...</span>
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
                  {loading ? t.saving : t.saveBtn}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 閉じるUI向上モーダル（背景タップ閉じる機能付き）         */}
      {/* ======================================================== */}
      {previewIndex !== null && images[previewIndex] && (
        <div
          onClick={() => setPreviewIndex(null)}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 backdrop-blur-md cursor-pointer select-none"
        >
          {/* ヘッダー */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex justify-between items-center text-zinc-300 z-20 pb-2 border-b border-zinc-800/80"
          >
            <div>
              <span className="text-xs font-bold text-amber-400 block">
                {t.imgProgress
                  .replace("{current}", String(previewIndex + 1))
                  .replace("{total}", String(images.length))}
              </span>
              <span className="text-[10px] text-zinc-500 block">{t.tapBackgroundToClose}</span>
            </div>
            <button
              onClick={() => setPreviewIndex(null)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs font-extrabold shadow-lg transition active:scale-95"
            >
              {t.close}
            </button>
          </div>

          {/* ズーム領域（イベントバブリング阻止でズーム操作時の離脱を防ぐ） */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 w-full h-full my-2 overflow-hidden flex items-center justify-center relative z-10"
          >
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
              <span className="text-zinc-400 text-xs">Loading...</span>
            )}
          </div>

          {/* フッターナビ */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex justify-between items-center gap-4 z-20 pt-2 border-t border-zinc-800/80"
          >
            <button
              disabled={previewIndex === 0}
              onClick={() => setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
              className="flex-1 py-3 bg-zinc-800 text-white text-xs font-bold rounded-xl disabled:opacity-30 disabled:pointer-events-none"
            >
              {t.prevImg}
            </button>
            <button
              disabled={previewIndex === images.length - 1}
              onClick={() =>
                setPreviewIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : prev))
              }
              className="flex-1 py-3 bg-zinc-800 text-white text-xs font-bold rounded-xl disabled:opacity-30 disabled:pointer-events-none"
            >
              {t.nextImg}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}