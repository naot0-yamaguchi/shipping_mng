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
    <div className="space-y-4 w-full">
      <div className="p-4 bg-white border border-stone-100 rounded-2xl flex items-center justify-between w-full shadow-sm box-border">
        <span className="text-xs text-stone-400 font-bold tracking-wider">{t.seqLabel}</span>
        <span className="text-xl font-black font-mono text-rose-500">{seqNo}</span>
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-stone-600">{t.editHeader}</span>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
          {t.editableStatus}
        </span>
      </div>

      <div className="p-5 bg-white border border-stone-100 rounded-3xl space-y-4 shadow-sm w-full box-border">
        {/* ① お客様名 */}
        <div className="relative space-y-1">
          <label className="text-xs font-bold text-stone-600">{t.customerName}</label>
          <input
            type="text"
            value={customerName}
            onFocus={() => fetchCustomers(customerName)}
            onChange={(e) => {
              setCustomerName(e.target.value);
              fetchCustomers(e.target.value);
            }}
            placeholder={t.customerPlaceholder}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:border-rose-400 text-stone-800 box-border"
          />

          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 z-30 bg-white border border-stone-200 rounded-2xl mt-1 shadow-xl max-h-48 overflow-y-auto">
              {customerSuggestions.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setCustomerName(c.name);
                    setShowSuggestions(false);
                  }}
                  className="p-3 text-sm hover:bg-rose-50 text-stone-700 cursor-pointer border-b border-stone-100 last:border-0"
                >
                  {c.name}
                </div>
              ))}

              {customerName.trim() && (
                <div
                  onClick={handleAddCustomer}
                  className="p-3 text-xs text-rose-500 font-bold hover:bg-rose-50 cursor-pointer bg-stone-50"
                >
                  {t.addCustomerPrefix} 「{customerName}」
                </div>
              )}
            </div>
          )}
        </div>

        {/* ② FEDEX Tracking No. */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-600">{t.fedexLabel}</label>
          <input
            type="text"
            value={fedexTrackingNo}
            onChange={(e) => setFedexTrackingNo(e.target.value)}
            placeholder={t.fedexPlaceholder}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:border-rose-400 text-stone-800 box-border"
          />
        </div>

        {/* ③ 商品画像 */}
        <div className="space-y-3 pt-2 border-t border-stone-100">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-stone-600">
              {t.imagesLabel} ({t.imgCount.replace("{count}", String(images.length))})
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
              className="w-full py-3 bg-stone-100 hover:bg-rose-50 border border-stone-200 text-stone-700 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              {uploading ? t.compressing : t.addPhotosBtn}
            </button>
          </div>

          {/* サムネイル一覧 */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {images.map((img, idx) => {
              const src = img.previewUrl || previewUrls[img.file_name];
              return (
                <div
                  key={img.id || idx}
                  onClick={() => onPreviewImage(idx, img.file_name)}
                  className="aspect-square bg-stone-100 border border-stone-200 rounded-2xl overflow-hidden cursor-pointer relative group flex items-center justify-center shadow-sm"
                >
                  {src ? (
                    <img
                      src={src}
                      alt={img.original_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <span className="text-[10px] text-stone-400 p-1 text-center">...</span>
                  )}

                  <span className="absolute bottom-1 left-1 bg-stone-900/60 text-white text-[9px] px-1.5 py-0.5 rounded-md font-mono">
                    #{idx + 1}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => onDeleteImage(img.file_name, e)}
                    className="absolute top-1 right-1 bg-rose-500 hover:bg-rose-600 text-white w-5 h-5 rounded-full text-[10px] font-bold shadow flex items-center justify-center transition active:scale-90"
                    title="削除"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ④ アクションボタン */}
        <button
          onClick={onSaveOrder}
          disabled={loading || uploading}
          className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl shadow-md shadow-rose-200 text-sm transition active:scale-95 disabled:bg-stone-300 disabled:shadow-none"
        >
          {loading ? t.saving : t.saveBtn}
        </button>
      </div>
    </div>
  );
};