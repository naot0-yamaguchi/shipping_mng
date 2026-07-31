import React, { RefObject } from "react";
import QuickPinchZoom from "react-quick-pinch-zoom";
import { ImageItem } from "@/types";

type Props = {
  t: any;
  previewIndex: number;
  images: ImageItem[];
  previewUrls: Record<string, string>;
  onClose: () => void;
  onDeleteImage: (fileName: string) => void;
  onUpdateZoom: (params: { x: number; y: number; scale: number }) => void;
  imgRef: RefObject<HTMLImageElement | null>;
  setPreviewIndex: React.Dispatch<React.SetStateAction<number | null>>;
};

export const ImagePreviewModal: React.FC<Props> = ({
  t,
  previewIndex,
  images,
  previewUrls,
  onClose,
  onDeleteImage,
  onUpdateZoom,
  imgRef,
  setPreviewIndex,
}) => {
  const currentImg = images[previewIndex];
  if (!currentImg) return null;

  const src = currentImg.previewUrl || previewUrls[currentImg.file_name];

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 flex flex-col justify-between overflow-hidden select-none">
      <div className="w-full bg-stone-900/90 border-b border-stone-800 px-4 py-3 flex justify-between items-center z-50 backdrop-blur-md">
        <div>
          <span className="text-xs font-bold text-rose-300 block">
            {t.imgProgress
              .replace("{current}", String(previewIndex + 1))
              .replace("{total}", String(images.length))}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onDeleteImage(currentImg.file_name)}
            className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-full text-xs font-bold transition active:scale-95"
          >
            {t.deleteBtn}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-full text-xs font-bold transition active:scale-95"
          >
            {t.close}
          </button>
        </div>
      </div>

      <div
        className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center z-10 my-1"
        onClick={onClose}
      >
        <div className="w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {src ? (
            <QuickPinchZoom onUpdate={onUpdateZoom} maxZoom={5}>
              <img
                ref={imgRef}
                src={src}
                alt="Zoom Preview"
                className="max-h-[75vh] max-w-full object-contain shadow-2xl rounded-lg"
              />
            </QuickPinchZoom>
          ) : (
            <span className="text-stone-400 text-xs">Loading...</span>
          )}
        </div>
      </div>

      <div className="w-full bg-stone-900/90 border-t border-stone-800 px-4 py-3 flex justify-between items-center gap-4 z-50 backdrop-blur-md">
        <button
          disabled={previewIndex === 0}
          onClick={() => setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
          className="flex-1 py-2.5 bg-stone-800 text-stone-200 text-xs font-bold rounded-xl disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition"
        >
          {t.prevImg}
        </button>
        <button
          disabled={previewIndex === images.length - 1}
          onClick={() =>
            setPreviewIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : prev))
          }
          className="flex-1 py-2.5 bg-stone-800 text-stone-200 text-xs font-bold rounded-xl disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition"
        >
          {t.nextImg}
        </button>
      </div>
    </div>
  );
};