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

  // デフォルト言語をタイ語 (th) に設定
  const getInitialLang = (): Language => {
    if (typeof window === "undefined") return "th";
    const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
    return (match?.[1] as Language) || "th";
  };

  const [lang, setLang] = useState<Language>(getInitialLang);
  const t = dictionary[lang] || dictionary["th"] || dictionary["ja"];

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
        setMessage(`${t.scanError || "Scan Error"}: ${err?.message || ""}`);
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
        setMessage(t.dataError || "Data fetch error");
      }
    } catch (e) {
      setMessage(t.networkError || "Network error");
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
        setMessage(t.dataError || "Data fetch error");
      }
    } catch (e) {
      setMessage(t.networkError || "Network error");
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
    setMessage(t.uploadingMsg || "Uploading...");

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
    setMessage(t.uploadSuccess || "Upload complete! ✨");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 画像削除
  const handleDeleteImage = async (fileName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(t.deleteConfirm || "Delete this photo?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/upload?file_name=${encodeURIComponent(fileName)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage(t.deleteSuccess || "Deleted successfully");
        setImages((prev) => prev.filter((img) => img.file_name !== fileName));
        if (previewIndex !== null) setPreviewIndex(null);
      } else {
        setMessage(t.deleteError || "Delete error");
      }
    } catch (err) {
      console.error(err);
      setMessage(t.deleteError || "Delete error");
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
        setMessage((t.saveSuccess || "Saved: {seq}").replace("{seq}", seqNo));
        setMode("scanner");
        setSeqNo("");
        setCustomerName("");
        setFedexTrackingNo("");
        setImages([]);
        setSearchResults(null);
      } else {
        setMessage(data.error || t.dataError || "Error saving");
      }
    } catch (e) {
      setMessage(t.networkError || "Network error");
    } finally {
      setLoading(false);
    }
  };

  // バルク印刷
  const handleBulkPrint = async () => {
    setIsPrinting(true);
    setPrintMessage(null);
  
    try {
      const res = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: bulkCount, printerIp }),
      });
  
      const data = await res.json();
  
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Printing failed');
      }
  
      setPrintMessage({ type: 'success', text: data.message });
    } catch (err: any) {
      setPrintMessage({ type: 'error', text: err.message });
    } finally {
      setIsPrinting(false);
    }
  };
  
  // 言語切り替え
  const handleLangChange = (newLang: Language) => {
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000`;
    setLang(newLang);
    router.refresh();
  };

  // page.tsx の return 部分の最外枠
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-6 w-full box-border overscroll-y-contain touch-manipulation overflow-x-hidden font-sans">
      <div className="relative max-w-md mx-auto w-full flex flex-col gap-4">
        {/* ヘッダー */}
        <Header
          title={t.title}
          lang={lang}
          onLangChange={handleLangChange}
          mode={mode}
          onBackToScanner={() => setMode("scanner")}
          backToScannerText={t.backToScanner}
        />

        {/* メッセージトースト */}
        {message && (
          <div className="p-3.5 bg-white border-2 border-pink-300 text-pink-700 text-sm rounded-2xl shadow-lg text-center font-bold flex items-center justify-center gap-2">
            <span>✨</span>
            <span>{message}</span>
          </div>
        )}

        {/* スキャン画面 */}
        {mode === "scanner" && (
          <main className="w-full">
            <ScannerSection
              onScanSingle={handleSelectSeq}
              onOpenBulkPrint={() => setShowBulkPrintModal(true)}
            />
          </main>
        )}

        {/* 詳細画面 */}
        {mode === "detail" && (
          <main className="w-full">
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
          </main>
        )}
      </div>

      {/* モーダル群 */}
      {showBulkPrintModal && (
        <BulkPrintModal
          t={t}
          onClose={() => {
            setShowBulkPrintModal(false);
            setPrintMessage(null);
          }}
          bulkCount={bulkCount}
          setBulkCount={setBulkCount}
          onBulkPrint={handleBulkPrint}
          isPrinting={isPrinting}
          printMessage={printMessage}
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