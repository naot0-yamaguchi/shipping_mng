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
    <header className="flex justify-between items-center mb-5 pb-2 border-b border-stone-200">
      <h1 className="text-xl font-bold tracking-tight text-stone-800 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"></span>
        {title}
      </h1>
      <div className="flex items-center gap-2">
        <select
          value={lang}
          onChange={(e) => onLangChange(e.target.value as Language)}
          className="bg-white text-xs text-stone-600 font-medium border border-stone-200 rounded-full px-3 py-1 focus:outline-none shadow-sm"
        >
          <option value="ja">日本語</option>
          <option value="en">English</option>
          <option value="th">ไทย</option>
        </select>

        {mode === "detail" && (
          <button
            onClick={onBackToScanner}
            className="text-xs bg-white hover:bg-stone-100 text-stone-600 px-3.5 py-1 rounded-full border border-stone-200 font-medium shadow-sm transition"
          >
            {backToScannerText}
          </button>
        )}
      </div>
    </header>
  );
};