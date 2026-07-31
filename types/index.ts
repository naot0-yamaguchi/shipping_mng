export type ImageItem = {
  id?: number;
  file_name: string;
  original_name: string;
  previewUrl?: string;
};

export type SearchResultItem = {
  seq_no: string;
  customer_name: string;
  fedex_tracking_no: string;
  thumbnail: string | null;
  isLocked: boolean;
};

export type Customer = {
  id: number;
  name: string;
};

export type Language = "ja" | "en" | "th";

export type ScanMode = "single" | "bulk_fedex";
