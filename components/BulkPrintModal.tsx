import React from "react";

type Props = {
  t: any;
  onClose: () => void;
  printerIp: string;
  setPrinterIp: (val: string) => void;
  bulkCount: number;
  setBulkCount: (val: number) => void;
  onBulkPrint: () => void;
  isPrinting: boolean;
  printMessage?: { type: "success" | "error"; text: string } | null;
};

export const BulkPrintModal: React.FC<Props> = ({
  t,
  onClose,
  printerIp,
  setPrinterIp,
  bulkCount,
  setBulkCount,
  onBulkPrint,
  isPrinting,
  printMessage,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-xl border border-stone-100">
        <div className="flex justify-between items-center border-b border-stone-100 pb-3">
          <h3 className="text-sm font-bold text-stone-800">{t.bulkPrintHeader}</h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-xs font-bold"
          >
            {t.close}
          </button>
        </div>

        {printMessage && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold leading-relaxed border ${
              printMessage.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            {printMessage.type === "error" ? "❌ " : "✅ "}
            {printMessage.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-stone-600 block mb-1.5">{t.printerIpLabel}</label>
            <input
              type="text"
              value={printerIp}
              onChange={(e) => setPrinterIp(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-sm font-mono focus:outline-none focus:border-rose-400 text-stone-800"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-stone-600 block mb-2">{t.printCountLabel}</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[10, 50, 100, 200].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setBulkCount(num)}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    bulkCount === num
                      ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <input
              type="number"
              value={bulkCount}
              onChange={(e) => setBulkCount(Number(e.target.value))}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-sm font-mono focus:outline-none focus:border-rose-400 text-stone-800"
            />
          </div>
        </div>

        <button
          onClick={onBulkPrint}
          disabled={isPrinting}
          className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl shadow-md shadow-rose-200 text-sm transition active:scale-95 disabled:bg-stone-300 disabled:shadow-none"
        >
          {isPrinting ? t.printing : `${bulkCount} ${t.printBtn}`}
        </button>
      </div>
    </div>
  );
};
