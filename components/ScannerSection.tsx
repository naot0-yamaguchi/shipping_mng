"use client";

import { useState } from "react";
import { Language } from "@/types";
import { dictionary } from "@/constants/dictionary";
import QrScannerModal from "./QrScannerModal";

interface ScannerSectionProps {
  onScanSingle: (seqNo: string) => void;
  onOpenBulkPrint?: () => void;
}

export default function ScannerSection({
  onScanSingle,
  onOpenBulkPrint,
}: ScannerSectionProps) {
  const getLang = (): Language => {
    if (typeof window === "undefined") return "th";
    const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
    return (match?.[1] as Language) || "th";
  };
  const t = dictionary[getLang()] || dictionary["th"] || dictionary["ja"] || ({} as any);

  const [singleInput, setSingleInput] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleScanSuccess = (decodedText: string) => {
    setIsScannerOpen(false);
    setSingleInput(decodedText);
    onScanSingle(decodedText);
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleInput.trim()) return;
    onScanSingle(singleInput.trim());
    setSingleInput("");
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="bg-white rounded-3xl p-5 shadow-lg shadow-pink-100/60 border border-pink-100">
        <form onSubmit={handleSingleSubmit} className="space-y-3">
          <label className="block text-sm font-bold text-slate-700 pl-1">
            {t?.singleInputLabel || "รหัสพัสดุ / หมายเลข Sequence"}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={singleInput}
              onChange={(e) => setSingleInput(e.target.value)}
              placeholder={t?.singlePlaceholder || "เช่น TMS-001"}
              className="flex-1 px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm font-semibold text-slate-800 placeholder-slate-400 transition"
            />
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-3.5 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-2xl text-lg shadow-sm active:scale-90 transition flex items-center justify-center"
              title="Camera Scan"
            >
              📸
            </button>
            <button
              type="submit"
              className="px-5 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-2xl text-sm shadow-md shadow-pink-200 active:scale-95 transition"
            >
              {t?.searchBtn || "ค้นหา"}
            </button>
          </div>
        </form>
      </div>

      {/* 🖨️ 一括印刷ボタン */}
      {onOpenBulkPrint && (
        <button
          type="button"
          onClick={onOpenBulkPrint}
          className="w-full py-3.5 px-4 bg-white hover:bg-pink-50 text-pink-600 border-2 border-pink-200 rounded-2xl text-sm font-bold shadow-md shadow-pink-100 flex items-center justify-center gap-2 active:scale-98 transition"
        >
          {t?.openBulkPrintModal || "🖨️ พิมพ์ฉลาก QR Code"}
        </button>
      )}

      {/* QRスキャンモーダル */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}