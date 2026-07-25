"use client";

import { QRCodeCanvas } from "qrcode.react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string; // QRコード化したい文字列（URLやトラッキング番号など）
  title?: string;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  value,
  title = "QRコード",
}: QRCodeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full text-center shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        
        <div className="bg-white p-4 rounded-md inline-block mb-4">
          <QRCodeCanvas
            value={value}
            size={200}
            level={"H"} // 誤り訂正レベル (L, M, Q, H)
            includeMargin={true}
          />
        </div>

        <p className="text-xs text-zinc-400 break-all mb-6">{value}</p>

        <button
          onClick={onClose}
          className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded transition"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
