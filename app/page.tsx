"use client";

import { useState, useRef, useCallback } from "react";
import imageCompression from "browser-image-compression";
import { Html5Qrcode } from "html5-qrcode";
import { make3dTransformValue } from "react-quick-pinch-zoom";

import { ImageItem, SearchResultItem, Customer, Language } from "@/types";
import { dictionary } from "@/constants/dictionary";
import { Header } from "@/components/Header";
import ScannerSection from "@/components/ScannerSection";
import { DetailSection } from "@/components/DetailSection";
import { BulkPrintModal } from "@/components/BulkPrintModal";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import { useRouter } from "next/navigation";

export default function ShippingManagementApp() {
  const router = useRouter();

  const getInitialLang = (): Language => {
    if (typeof window === "undefined") return "ja";
    const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
    return (match?.[1] as Language) || "ja";
  };

  const [lang, setLang] = useState<Language>(getInitialLang);
  const t = dictionary[lang];

  const [mode, setMode] = useState<"scanner" | "detail">("scanner");
  const [seqNo, setSeqNo] = useState<string>("");
  const [fedexSearchInput, setFedexSearchInput] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null);

  // 詳細画面用
  const [customerName, setCustomerName] = useState<string>("");
  const [fedexTrackingNo, setFedexTrackingNo] = useState<string>("");
  const [images, setImages] = useState<ImageItem[]>([]);

  // 顧客補完用
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // 画像ズーム
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  // バルク印刷用
  const [showBulkPrintModal, setShowBulkPrintModal] = useState<boolean>(false);
  const [bulkCount, setBulkCount] = useState<number>(100);
  const [printerIp, setPrinterIp] = useState<string>("192.168.1.100");
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // UI・通信状態
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // Ref
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  
  // 一括印刷モーダルのメッセージ
  const [printMessage, setPrintMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const onUpdateZoom = useCallback(({ x, y, scale }: { x: number; y: number; scale: number }) => {
    const { current: img } = imgRef;
    if (img) {
      const value = make3dTransformValue({ x, y, scale });
      img.style.setProperty("transform", value);
    }
  }, []);

  // スキャナー制御
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

  // シーケンス選択・読込
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

  // FEDEX 追跡番号検索
  const handleSearchByFedex = async () => {
    if (!fedexSearchInput.trim()) return;
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/shipping?fedex=${encodeURIComponent(fedexSearchInput.trim())}`);
      const data = await res.json();

      if (res.ok && data.results) {
        setSearchResults(data.results);
        data.results.forEach((item: SearchResultItem) => {
          if (item.thumbnail) fetchPreviewUrl(item.thumbnail);
        });
      } else {
        setMessage(t.dataError);
      }
    } catch (e) {
      setMessage(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  // 顧客補完検索
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

  // 画像アップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage(t.uploadingMsg);

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
        console.error("Upload error:", err);
      }
    }

    setUploading(false);
    setMessage(t.uploadSuccess);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 画像削除
  const handleDeleteImage = async (fileName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(t.deleteConfirm)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/upload?file_name=${encodeURIComponent(fileName)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage(t.deleteSuccess);
        setImages((prev) => prev.filter((img) => img.file_name !== fileName));
        if (previewIndex !== null) setPreviewIndex(null);
      } else {
        setMessage(t.deleteError);
      }
    } catch (err) {
      console.error(err);
      setMessage(t.deleteError);
    } finally {
      setLoading(false);
    }
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

  // 保存処理
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
        setSearchResults(null);
      } else {
        setMessage(data.error || t.dataError);
      }
    } catch (e) {
      setMessage(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  // バルク印刷
  const handleBulkPrint = async () => {
    setIsPrinting(true);
    setPrintMessage(null); // 前回メッセージのリセット
  
    try {
      const res = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: bulkCount, printerIp }),
      });
  
      const data = await res.json();
  
      if (!res.ok || !data.success) {
        throw new Error(data.message || '印刷エラーが発生しました');
      }
  
      // 成功時
      setPrintMessage({ type: 'success', text: data.message });
    } catch (err: any) {
      // ❌ タイムアウトなどのエラー時
      setPrintMessage({ type: 'error', text: err.message });
    } finally {
      setIsPrinting(false);
    }
  };
  
  // 言語切り替えをCookieに保存
  const handleLangChange = (newLang: Language) => {
    // 1. Cookie に保存 (クッキー名: NEXT_LOCALE, 有効期限: 1年)
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000`;

    // 2. React State を更新 (クライアント側の即時反映)
    setLang(newLang);

    // 3. ルーターをリフレッシュしてサーバーコンポーネントやキャッシュを描画更新
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 p-4 w-full box-border overscroll-y-contain touch-manipulation overflow-x-hidden font-sans">
      <div className="max-w-md mx-auto w-full">
        {/* ヘッダー */}
        <Header
          title={t.title}
          lang={lang}
          onLangChange={handleLangChange}
          mode={mode}
          onBackToScanner={() => setMode("scanner")}
          backToScannerText={t.backToScanner}
        />

        {/* メッセージ表示 */}
        {message && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl shadow-sm text-center font-medium animate-fade-in">
            {message}
          </div>
        )}

        {/* スキャン画面 */}
        {mode === "scanner" && (
          <ScannerSection
            onScanSingle={handleSelectSeq}
          />
        )}

        {/* 詳細画面 */}
        {mode === "detail" && (
          <DetailSection
            t={t}
            seqNo={seqNo}
            customerName={customerName}
            setCustomerName={setCustomerName}
            fetchCustomers={fetchCustomers}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            customerSuggestions={customerSuggestions}
            handleAddCustomer={handleAddCustomer}
            fedexTrackingNo={fedexTrackingNo}
            setFedexTrackingNo={setFedexTrackingNo}
            images={images}
            previewUrls={previewUrls}
            uploading={uploading}
            fileInputRef={fileInputRef}
            handleImageUpload={handleImageUpload}
            onPreviewImage={(idx, fileName) => {
              if (fileName) fetchPreviewUrl(fileName);
              setPreviewIndex(idx);
            }}
            onDeleteImage={handleDeleteImage}
            onSaveOrder={handleSaveOrder}
            loading={loading}
            onOpenBulkPrint={() => setShowBulkPrintModal(true)}
          />
        )}
      </div>

      {/* モーダル群 */}
      {showBulkPrintModal && (
        <BulkPrintModal
          t={t}
          onClose={() => {
            setShowBulkPrintModal(false);
            setPrintMessage(null); // 👈 閉じる時にクリア
          }}
          printerIp={printerIp}
          setPrinterIp={setPrinterIp}
          bulkCount={bulkCount}
          setBulkCount={setBulkCount}
          onBulkPrint={handleBulkPrint}
          isPrinting={isPrinting}
          printMessage={printMessage} // 👈 これを追加！
        />
      )}

      {previewIndex !== null && images[previewIndex] && (
        <ImagePreviewModal
          t={t}
          previewIndex={previewIndex}
          images={images}
          previewUrls={previewUrls}
          onClose={() => setPreviewIndex(null)}
          onDeleteImage={handleDeleteImage}
          onUpdateZoom={onUpdateZoom}
          imgRef={imgRef}
          setPreviewIndex={setPreviewIndex}
        />
      )}
    </div>
  );
}