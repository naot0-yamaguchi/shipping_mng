import type { Metadata, Viewport } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

// タイ人女性に人気の高いモダン・クリーンなループレスフォント
const promptFont = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TMS - ระบบจัดการพัสดุ",
  description: "Shipping & Parcel Management System",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TMS App",
  },
};

// スマホ操作時の誤ズーム防止とセーフエリア対応
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#fdf2f8", // 淡いピンク (Tailwind pink-50相当)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${promptFont.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 selection:bg-pink-200 selection:text-pink-900 overscroll-none">
        {children}
      </body>
    </html>
  );
}