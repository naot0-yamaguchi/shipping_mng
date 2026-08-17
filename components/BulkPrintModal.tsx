"use client";

import React from "react";

type Props = {
  t: any;
  onClose: () => void;
  bulkCount: number;
  setBulkCount: (val: number) => void;
  onBulkPrint: () => void;
  isPrinting: boolean;
  printMessage: { type: "success" | "error"; text: string } | null;
  printerIp?: string;
  setPrinterIp?: (val: string) => void;
};

export const BulkPrintModal: React.FC<Props> = ({
  t,
  onClose,
  bulkCount,
  setBulkCount,
  onBulkPrint,
  isPrinting,
  printMessage,
}) => {
  const quickCounts = [20, 50, 100, 200];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-pink-100 relative">
        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={onClose}
          disabled={isPrinting}
          className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 font-bold p-2 rounded-full text-base active:scale-90 transition"
        >
          ✕
        </button>

        {/* ヘッダー */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-pink-100 to-rose-100 text-pink-600 rounded-3xl mx-auto flex items-center justify-center text-2xl shadow-inner mb-3">
            🖨️
          </div>
          <h2 className="text-base font-bold text-slate-800">
            {t?.bulkPrintHeader || "พิมพ์ฉลาก QR Code"}
          </h2>
        </div>

        {/* メッセージ */}
        {printMessage && (
          <div
            className={`p-3 rounded-2xl mb-4 text-xs font-bold text-center flex items-center justify-center gap-1.5 ${
              printMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            <span>{printMessage.type === "success" ? "✨" : "⚠️"}</span>
            <span>{printMessage.text}</span>
          </div>
        )}

        {/* 枚数選択 */}
        <div className="space-y-4 mb-6">
          <label className="block text-xs font-bold text-slate-600 text-center">
            {t?.printCountLabel || "เลือกจำนวนที่ต้องการพิมพ์"}
          </label>

          {/* クイック選択 */}
          <div className="grid grid-cols-4 gap-2">
            {quickCounts.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setBulkCount(count)}
                className={`py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
                  bulkCount === count
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200"
                    : "bg-slate-50 text-slate-600 hover:bg-pink-50 border border-slate-100"
                }`}
              >
                {count}
              </button>
            ))}
          </div>

          {/* カウンター */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setBulkCount(Math.max(1, bulkCount - 10))}
              className="w-11 h-11 bg-slate-100 hover:bg-pink-100 text-slate-700 font-bold rounded-2xl flex items-center justify-center text-xl active:scale-90 transition"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={1000}
              value={bulkCount}
              onChange={(e) => setBulkCount(Math.max(1, Number(e.target.value)))}
              className="w-24 text-center py-2 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <button
              type="button"
              onClick={() => setBulkCount(bulkCount + 10)}
              className="w-11 h-11 bg-slate-100 hover:bg-pink-100 text-slate-700 font-bold rounded-2xl flex items-center justify-center text-xl active:scale-90 transition"
            >
              +
            </button>
          </div>
        </div>

        {/* 実行ボタン */}
        <button
          type="button"
          onClick={onBulkPrint}
          disabled={isPrinting}
          className="w-full py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 hover:opacity-95 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold rounded-2xl shadow-lg shadow-pink-200 text-sm active:scale-95 transition flex items-center justify-center gap-2"
        >
          {isPrinting ? (
            t?.printing || "กำลังสั่งพิมพ์..."
          ) : (
            (t?.printActionBtn || "✨ สั่งพิมพ์ {count} แผ่น").replace("{count}", String(bulkCount))
          )}
        </button>
      </div>
    </div>
  );
};