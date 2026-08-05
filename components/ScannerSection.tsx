"use client";

import { useState, useRef } from "react";
import { ScanMode } from "@/types";
import QrScannerModal from "./QrScannerModal";

interface ScannerSectionProps {
  t: any;
  onScanSingle: (seqNo: string) => void;
  onRefreshList?: () => void;
}

export default function ScannerSection({
  t,
  onScanSingle,
  onRefreshList,
}: ScannerSectionProps) {
  const [mode, setMode] = useState<ScanMode>("single");

  const [singleInput, setSingleInput] = useState("");

  const [fedexNo, setFedexNo] = useState("");
  const [seqInput, setSeqInput] = useState("");
  const [scannedSeqs, setScannedSeqs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeTarget, setActiveTarget] = useState<"single" | "bulk">("single");

  const fedexInputRef = useRef<HTMLInputElement>(null);
  const seqInputRef = useRef<HTMLInputElement>(null);

  const handleOpenScanner = (target: "single" | "bulk") => {
    setActiveTarget(target);
    setIsScannerOpen(true);
  };

  const handleScanSuccess = (decodedText: string) => {
    setIsScannerOpen(false);

    if (activeTarget === "single") {
      setSingleInput(decodedText);
      onScanSingle(decodedText);
    } else {
      if (scannedSeqs.includes(decodedText)) {
        setMessage({ text: t.alreadyInList || "既にリストに追加されています", type: "error" });
      } else {
        setScannedSeqs((prev) => [...prev, decodedText]);
        setMessage(null);
      }
    }
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleInput.trim()) return;
    onScanSingle(singleInput.trim());
    setSingleInput("");
  };

  const handleAddSeq = (e: React.FormEvent) => {
    e.preventDefault();
    const val = seqInput.trim();
    if (!val) return;

    if (scannedSeqs.includes(val)) {
      setMessage({ text: t.alreadyInList || "既にリストに追加されています", type: "error" });
    } else {
      setScannedSeqs((prev) => [...prev, val]);
      setMessage(null);
    }
    setSeqInput("");
  };

  const handleRemoveSeq = (targetSeq: string) => {
    setScannedSeqs((prev) => prev.filter((seq) => seq !== targetSeq));
  };

  const handleBulkSubmit = async () => {
    if (!fedexNo.trim()) {
      setMessage({ text: t.requireFedexNo || "FEDEX追跡番号を入力してください", type: "error" });
      fedexInputRef.current?.focus();
      return;
    }
    if (scannedSeqs.length === 0) {
      setMessage({
        text: t.requireAtLeastOneQr || "紐付けるQRコードを1件以上スキャンしてください",
        type: "error",
      });
      seqInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/shipping/bulk-fedex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fedexTrackingNo: fedexNo.trim(),
          seqNos: scannedSeqs,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "更新に失敗しました");

      setMessage({ text: data.message, type: "success" });
      setScannedSeqs([]);
      setFedexNo("");
      if (onRefreshList) onRefreshList();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100 mb-6">
      <div className="flex bg-rose-50 p-1 rounded-xl mb-4">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            mode === "single"
              ? "bg-white text-rose-600 shadow-sm"
              : "text-slate-500 hover:text-rose-400"
          }`}
        >
          {t.scanModeSingle || "🔍 通常スキャン"}
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk_fedex")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            mode === "bulk_fedex"
              ? "bg-white text-rose-600 shadow-sm"
              : "text-slate-500 hover:text-rose-400"
          }`}
        >
          {t.scanModeBulkFedex || "📦 FEDEX追跡番号 一括紐付け"}
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl mb-4 text-xs font-semibold ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
              : "bg-rose-50 text-rose-600 border border-rose-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {mode === "single" && (
        <form onSubmit={handleSingleSubmit} className="space-y-3">
          <label className="block text-xs font-bold text-slate-500">
            {t.singleInputLabel || "荷物QRコード / シーケンス番号を入力"}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={singleInput}
              onChange={(e) => setSingleInput(e.target.value)}
              placeholder={t.singleInputPlaceholder || "例: TMS-001"}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-400 text-sm"
            />
            <button
              type="button"
              onClick={() => handleOpenScanner("single")}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm transition-colors flex items-center justify-center"
              title={t.startScanner}
            >
              📷
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
            >
              {t.searchBtn}
            </button>
          </div>
        </form>
      )}

      {mode === "bulk_fedex" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              {t.step1FedexTitle || "① FEDEX 追跡番号"}
            </label>
            <input
              ref={fedexInputRef}
              type="text"
              value={fedexNo}
              onChange={(e) => setFedexNo(e.target.value)}
              placeholder={t.fedexPlaceholder}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-400 text-sm font-mono"
            />
          </div>

          <form onSubmit={handleAddSeq}>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              {t.step2ScanTitle || "② 紐付ける荷物QRコードを連続スキャン"}
            </label>
            <div className="flex gap-2">
              <input
                ref={seqInputRef}
                type="text"
                value={seqInput}
                onChange={(e) => setSeqInput(e.target.value)}
                placeholder="QR..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-400 text-sm"
              />
              <button
                type="button"
                onClick={() => handleOpenScanner("bulk")}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm transition-colors flex items-center justify-center"
                title={t.startScanner}
              >
                📷
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {t.addBtn || "追加"}
              </button>
            </div>
          </form>

          {scannedSeqs.length > 0 && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500">
                  {(t.scannedCount || "スキャン済み ({count}件)").replace("{count}", String(scannedSeqs.length))}
                </span>
                <button
                  type="button"
                  onClick={() => setScannedSeqs([])}
                  className="text-xs text-rose-400 hover:underline"
                >
                  {t.clearAll || "すべてクリア"}
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                {scannedSeqs.map((seq, index) => (
                  <div
                    key={seq}
                    className="flex justify-between items-center bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                  >
                    <span>
                      {index + 1}. <strong className="text-slate-700">{seq}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSeq(seq)}
                      className="text-slate-400 hover:text-rose-500 font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={isSubmitting}
                className="w-full mt-3 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-bold rounded-xl text-sm shadow-md transition-all flex justify-center items-center gap-2"
              >
                {isSubmitting
                  ? t.submitting || "登録中..."
                  : (t.bulkBindBtn || "✨ {count}件の荷物に一括紐付け").replace("{count}", String(scannedSeqs.length))}
              </button>
            </div>
          )}
        </div>
      )}

      <QrScannerModal
        t={t}
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}
