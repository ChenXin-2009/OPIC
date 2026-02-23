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
  title: "SoMap-太阳系实时地图",
  description: "SoMap - 交互式太阳系和宇宙可视化应用。基于真实天文数据，探索从太阳系到可观测宇宙的9个尺度层次。支持高精度行星轨道计算、人造卫星实时追踪、银河系可视化。",
  keywords: [
    "太阳系",
    "宇宙可视化",
    "天文",
    "行星轨道",
    "卫星追踪",
    "Three.js",
    "NASA",
    "星历数据",
    "银河系",
    "Solar System",
    "Universe Visualization",
    "Astronomy",
  ],
  authors: [{ name: "ChenXin-2009", url: "https://github.com/ChenXin-2009" }],
  creator: "ChenXin-2009",
  publisher: "ChenXin-2009",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://somap.cxin.tech',
    title: 'SoMap - 太阳系实时地图',
    description: '交互式太阳系和宇宙可视化应用，探索从太阳系到可观测宇宙',
    siteName: 'SoMap',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoMap - 太阳系实时地图',
    description: '交互式太阳系和宇宙可视化应用',
  },
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
