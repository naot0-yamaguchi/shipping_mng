import React from "react";
import { Language } from "@/types";

type Props = {
  title: string;
  lang: Language;
  onLangChange: (lang: Language) => void;
  mode: "scanner" | "detail";
  onBackToScanner: () => void;
  backToScannerText: string;
};

export const Header: React.FC<Props> = ({
  title,
  lang,
  onLangChange,
  mode,
  onBackToScanner,
  backToScannerText,
}) => {
  return (
    <header className="flex justify-between items-center py-2 px-1">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white shadow-md shadow-pink-200 text-sm font-black">
          📦
        </div>
        <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 bg-clip-text text-transparent">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {mode === "detail" && (
          <button
            onClick={onBackToScanner}
            className="text-xs bg-white/80 backdrop-blur text-pink-600 font-semibold px-3 py-1.5 rounded-full border border-pink-200 shadow-sm hover:bg-pink-50 active:scale-95 transition flex items-center gap-1"
          >
            <span>←</span> {backToScannerText}
          </button>
        )}

        <div className="relative">
          <select
            value={lang}
            onChange={(e) => onLangChange(e.target.value as Language)}
            className="appearance-none bg-white/80 backdrop-blur text-xs text-slate-700 font-bold border border-pink-100 rounded-full pl-3 pr-6 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 shadow-sm cursor-pointer"
          >
            <option value="th">🇹🇭 ไทย</option>
            <option value="en">🇺🇸 EN</option>
            <option value="ja">🇯🇵 JP</option>
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] pointer-events-none text-slate-400">
            ▼
          </span>
        </div>
      </div>
    </header>
  );
};