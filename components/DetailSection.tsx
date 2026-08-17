"use client";

import React, { RefObject } from "react";
import { Customer, ImageItem } from "@/types";

type Props = {
  t: any;
  seqNo: string;
  customerName: string;
  setCustomerName: (val: string) => void;
  fetchCustomers: (query?: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (val: boolean) => void;
  customerSuggestions: Customer[];
  handleAddCustomer: () => void;
  fedexTrackingNo: string;
  setFedexTrackingNo: (val: string) => void;
  images: ImageItem[];
  previewUrls: Record<string, string>;
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPreviewImage: (idx: number, fileName: string) => void;
  onDeleteImage: (fileName: string, e?: React.MouseEvent) => void;
  onSaveOrder: () => void;
  loading: boolean;
  onOpenBulkPrint?: () => void;
};

export const DetailSection: React.FC<Props> = ({
  t,
  seqNo,
  customerName,
  setCustomerName,
  fetchCustomers,
  showSuggestions,
  setShowSuggestions,
  customerSuggestions,
  handleAddCustomer,
  fedexTrackingNo,
  setFedexTrackingNo,
  images,
  previewUrls,
  uploading,
  fileInputRef,
  handleImageUpload,
  onPreviewImage,
  onDeleteImage,
  onSaveOrder,
  loading,
}) => {
  return (
    <div className="space-y-4 w-full pb-28">
      {/* シーケンスヘッダー（印刷ボタンを削除してシンプルに） */}
      <div className="p-5 bg-white rounded-3xl border border-pink-100 shadow-lg shadow-pink-100/50 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-pink-500 font-bold tracking-wider mb-1">
          {t?.seqLabel || "รหัส Sequence"}
        </span>
        <span className="text-3xl font-black font-mono bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
          {seqNo}
        </span>
      </div>

      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-bold text-slate-700">{t?.editHeader || "ข้อมูลพัสดุ"}</span>
        <span className="px-3 py-1 bg-pink-100 text-pink-700 text-xs font-bold rounded-full border border-pink-200">
          {t?.editableStatus || "✨ แก้ไขข้อมูลได้"}
        </span>
      </div>

      <div className="p-5 bg-white border border-pink-100 rounded-3xl space-y-4 shadow-xl shadow-pink-100/50 w-full">
        {/* 顧客名 */}
        <div className="relative space-y-1.5">
          <label className="text-xs font-bold text-slate-700 pl-1">
            {t?.customerName || "ชื่อลูกค้า"}
          </label>
          <input
            type="text"
            value={customerName}
            onFocus={() => fetchCustomers(customerName)}
            onChange={(e) => {
              setCustomerName(e.target.value);
              fetchCustomers(e.target.value);
            }}
            placeholder={t?.customerPlaceholder || "แตะเพื่อค้นหาหรือเลือกชื่อลูกค้า"}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-300 text-slate-800 transition"
          />

          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 z-30 bg-white border border-pink-100 rounded-2xl mt-1.5 shadow-2xl max-h-48 overflow-y-auto divide-y divide-pink-50">
              {customerSuggestions.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setCustomerName(c.name);
                    setShowSuggestions(false);
                  }}
                  className="p-3.5 text-xs font-bold hover:bg-pink-50 text-slate-700 cursor-pointer transition"
                >
                  {c.name}
                </div>
              ))}

              {customerName.trim() && (
                <div
                  onClick={handleAddCustomer}
                  className="p-3.5 text-xs text-pink-600 font-bold hover:bg-pink-50 cursor-pointer bg-pink-50/50"
                >
                  {t?.addCustomerPrefix || "＋ บันทึกชื่อลูกค้าใหม่: "}「{customerName}」
                </div>
              )}
            </div>
          )}
        </div>

        {/* FEDEX Tracking */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 pl-1">
            {t?.fedexLabel || "หมายเลข FEDEX Tracking"}
          </label>
          <input
            type="text"
            value={fedexTrackingNo}
            onChange={(e) => setFedexTrackingNo(e.target.value)}
            placeholder={t?.fedexPlaceholder || "กรอกเลข Tracking (เช่น 7783XXXXXX)"}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-300 text-slate-800 transition"
          />
        </div>

        {/* 写真セクション */}
        <div className="space-y-3 pt-3 border-t border-pink-100">
          <div className="flex justify-between items-center pl-1">
            <label className="text-xs font-bold text-slate-700">
              {t?.imagesLabel || "รูปภาพพัสดุ"} <span className="text-pink-500 font-normal">{(t?.imgCount || "({count})").replace("{count}", String(images.length))}</span>
            </label>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              disabled={uploading}
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3.5 bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-600 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {uploading ? (t?.compressing || "กำลังประมวลผลรูปภาพ...") : (t?.addPhotosBtn || "📸 ถ่ายรูป / เพิ่มรูปภาพ")}
            </button>
          </div>

          {/* サムネイルグリッド */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {images.map((img, idx) => {
              const src = img.previewUrl || previewUrls[img.file_name];
              return (
                <div
                  key={img.id || idx}
                  onClick={() => onPreviewImage(idx, img.file_name)}
                  className="aspect-square bg-slate-100 border border-pink-100 rounded-2xl overflow-hidden cursor-pointer relative group flex items-center justify-center shadow-sm"
                >
                  {src ? (
                    <img
                      src={src}
                      alt={img.original_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <span className="text-[10px] text-pink-300 font-bold">...</span>
                  )}

                  <span className="absolute bottom-1 left-1 bg-slate-900/70 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-lg font-mono">
                    #{idx + 1}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => onDeleteImage(img.file_name, e)}
                    className="absolute top-1.5 right-1.5 bg-rose-500 hover:bg-rose-600 text-white w-6 h-6 rounded-full text-[10px] font-bold shadow flex items-center justify-center transition active:scale-90"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* スマホ片手操作用 Sticky ボトム保存ボタン */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-pink-100 shadow-2xl z-20 flex justify-center">
        <div className="max-w-md w-full">
          <button
            onClick={onSaveOrder}
            disabled={loading || uploading}
            className="w-full py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 hover:opacity-95 text-white font-bold rounded-2xl shadow-lg shadow-pink-200 text-sm transition active:scale-95 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
          >
            {loading ? (t?.saving || "กำลังบันทึกข้อมูล...") : (t?.saveBtn || "บันทึกข้อมูลเรียบร้อย ✨")}
          </button>
        </div>
      </div>
    </div>
  );
};