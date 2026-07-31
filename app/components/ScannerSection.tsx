import React from "react";
import { SearchResultItem } from "@/types";

type Props = {
  t: any;
  isScanning: boolean;
  onStartScanner: () => void;
  onStopScanner: () => void;
  fedexSearchInput: string;
  setFedexSearchInput: (val: string) => void;
  onSearchByFedex: () => void;
  loading: boolean;
  searchResults: SearchResultItem[] | null;
  previewUrls: Record<string, string>;
  onSelectSeq: (seq: string) => void;
  onOpenBulkPrint: () => void;
};

export const ScannerSection: React.FC<Props> = ({
  t,
  isScanning,
  onStartScanner,
  onStopScanner,
  fedexSearchInput,
  setFedexSearchInput,
  onSearchByFedex,
  loading,
  searchResults,
  previewUrls,
  onSelectSeq,
  onOpenBulkPrint,
}) => {
  return (
    <div className="space-y-4 text-center w-full">
      {/* QRスキャナーCard */}
      <div className="p-6 bg-white border border-stone-100 rounded-3xl shadow-sm space-y-4 w-full box-border">
        <h2 className="text-base font-bold text-stone-800">{t.scanHeader}</h2>
        <p className="text-xs text-stone-400 font-normal">{t.scanDesc}</p>

        {!isScanning ? (
          <button
            onClick={onStartScanner}
            className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl shadow-md shadow-rose-200 text-sm transition active:scale-98"
          >
            {t.startScanner}
          </button>
        ) : (
          <div className="space-y-3 w-full">
            <div id="reader" className="overflow-hidden rounded-2xl border-2 border-rose-300 bg-stone-900 w-full shadow-inner"></div>
            <button
              onClick={onStopScanner}
              className="w-full py-2 bg-stone-100 text-stone-500 text-xs rounded-xl font-medium"
            >
              {t.cancel}
            </button>
          </div>
        )}
      </div>

      {/* FEDEX 追跡番号での検索 */}
      <div className="p-4 bg-white border border-stone-100 rounded-2xl space-y-2 text-left w-full shadow-sm box-border">
        <label className="text-xs font-bold text-stone-600">{t.searchByFedex}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={fedexSearchInput}
            onChange={(e) => setFedexSearchInput(e.target.value)}
            placeholder="例: 7783XXXXXX"
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-rose-400 font-mono text-stone-800 box-border"
          />
          <button
            onClick={onSearchByFedex}
            disabled={loading}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs rounded-xl active:scale-95 shadow-sm transition"
          >
            {t.searchBtn}
          </button>
        </div>
      </div>

      {/* FEDEX 検索結果 */}
      {searchResults !== null && (
        <div className="space-y-2.5 text-left pt-1">
          <h3 className="text-xs font-bold text-stone-500 px-1">
            {t.searchResultsTitle} ({searchResults.length}件)
          </h3>

          {searchResults.length === 0 ? (
            <p className="text-xs text-stone-400 p-4 bg-white rounded-2xl border border-stone-100 text-center">
              {t.noResults}
            </p>
          ) : (
            <div className="space-y-2">
              {searchResults.map((item) => (
                <div
                  key={item.seq_no}
                  onClick={() => onSelectSeq(item.seq_no)}
                  className="p-3.5 bg-white hover:bg-rose-50/50 border border-stone-100 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition active:scale-98 shadow-sm"
                >
                  <div className="w-12 h-12 bg-stone-100 rounded-xl border border-stone-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.thumbnail && previewUrls[item.thumbnail] ? (
                      <img
                        src={previewUrls[item.thumbnail]}
                        alt="thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-stone-400">No Image</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-extrabold font-mono text-rose-500">
                      {item.seq_no}
                    </span>
                    <p className="text-xs text-stone-700 font-bold truncate mt-0.5">
                      {item.customer_name || "(顧客名未登録)"}
                    </p>
                    <p className="text-[10px] text-stone-400 font-mono truncate">
                      {item.fedex_tracking_no}
                    </p>
                  </div>

                  <span className="text-stone-300 text-sm font-bold">＞</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 直接シーケンス指定 */}
      <div className="p-4 bg-white/60 border border-stone-200/60 rounded-2xl space-y-2 text-left w-full box-border">
        <label className="text-xs font-medium text-stone-500">{t.searchBySeq}</label>
        <input
          type="text"
          placeholder="例: SEQ001"
          className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-rose-400 box-border text-stone-800"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value) {
              onSelectSeq(e.currentTarget.value);
            }
          }}
        />
      </div>

      {/* 🖨️ QRコード一括発行 */}
      <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-2.5 text-left w-full box-border">
        <div>
          <h3 className="text-xs font-bold text-rose-600">{t.bulkPrintSection}</h3>
          <p className="text-[11px] text-stone-500 mt-0.5">{t.bulkPrintDesc}</p>
        </div>
        <button
          onClick={onOpenBulkPrint}
          className="w-full py-2.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
        >
          {t.openBulkPrintModal}
        </button>
      </div>
    </div>
  );
};