import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

import { Analytics } from "@vercel/analytics/next";          // ← 新增
import { SpeedInsights } from "@vercel/speed-insights/next"; // ← 新增
import LanguageDetector from "@/components/LanguageDetector";
import Header from "@/components/Header";
import LoadingPage from "@/components/loading/LoadingPage";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SolMap-太阳系实时地图",
  description: "SolMap - 太阳系实时地图，可视化太阳系行星轨道和位置",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.svg",
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};

/**
 * 从 Accept-Language header 检测用户语言
 */
async function detectLanguage(): Promise<"zh" | "en"> {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language") || "";
  
  // 检查是否包含中文
  if (acceptLanguage.toLowerCase().includes("zh")) {
    return "zh";
  }
  
  // 默认返回英文
  return "en";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await detectLanguage();
  
  return (
    <html lang={lang} style={{ backgroundColor: '#000' }}>
      <head>
        {/* 关键 CSS - 确保黑色背景立即显示 */}
        <style dangerouslySetInnerHTML={{__html: `
          html, body {
            background-color: #000 !important;
            margin: 0;
            padding: 0;
          }
          
          #main-content {
            opacity: 0;
            transition: opacity 0.3s;
          }
          
          body.loaded #main-content {
            opacity: 1;
          }
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: '#000' }}
      >
        {/* React 加载页面 - 唯一的加载界面 */}
        <LoadingPage />
        
        <div id="main-content">
          <Header />
          <LanguageDetector initialLang={lang} />
          {children}
        </div>

        {/* Vercel Analytics - 网站访问统计 */}
        <Analytics />

        {/* Vercel SpeedInsights - 性能分析 */}
        <SpeedInsights />
      </body>
    </html>
  );
}
