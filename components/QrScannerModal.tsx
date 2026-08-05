"use client";

import { useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface QrScannerModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export default function QrScannerModal({
  t,
  isOpen,
  onClose,
  onScanSuccess,
}: QrScannerModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        onScanSuccess(decodedText);
        scanner.clear();
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-rose-100 flex flex-col items-center">
        <h3 className="text-sm font-bold text-slate-700 mb-3 text-center">
          {t?.qrModalTitle || "QRコードをカメラにかざしてください"}
        </h3>

        <div id="qr-reader" className="w-full overflow-hidden rounded-xl border border-slate-200" />

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-colors"
        >
          {t?.cancel || "キャンセル"}
        </button>
      </div>
    </div>
  );
}
