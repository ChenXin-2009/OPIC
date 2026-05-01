import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

import { Analytics } from "@vercel/analytics/next";          // ← 新增
import { SpeedInsights } from "@vercel/speed-insights/next"; // ← 新增
import LanguageDetector from "@/components/LanguageDetector";
import Header from "@/components/Header";
import { WindowManager } from "@/components/window-manager";
import { Dock } from "@/components/dock";
import { DockInitializer } from "@/components/DockInitializer";
import { DockWindowSync } from "@/components/DockWindowSync";
import { ModDockSync } from "@/components/ModDockSync";

// 使用系统字体作为fallback
// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
//   display: "swap",
//   fallback: ["system-ui", "arial"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
//   display: "swap",
//   fallback: ["ui-monospace", "monospace"],
// });

// 多语言 metadata
const metadataZh: Metadata = {
  title: "OPIC开放集成宇宙",
  description: "OPIC — Open Integrated Cosmos（开放集成宇宙）- 一个基于 Web 的多尺度宇宙可视化与天文数据集成系统。基于真实天文数据，探索从太阳系到可观测宇宙的9个尺度层次。支持高精度行星轨道计算、人造卫星实时追踪、银河系可视化。",
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
    "OPIC",
    "Open Integrated Cosmos",
  ],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://opic.cxin.tech',
    title: 'OPIC — Open Integrated Cosmos',
    description: '一个基于 Web 的多尺度宇宙可视化与天文数据集成系统，探索从太阳系到可观测宇宙',
    siteName: 'OPIC',
  },
};

const metadataEn: Metadata = {
  title: "OPIC - Open Integrated Cosmos",
  description: "OPIC - A web-based multi-scale universe visualization and astronomical data integration system. Explore 9 cosmic scales from the solar system to the observable universe with real astronomical data. Features high-precision planetary orbit calculation, real-time satellite tracking, and Milky Way visualization.",
  keywords: [
    "Solar System",
    "Universe Visualization",
    "Astronomy",
    "Planetary Orbits",
    "Satellite Tracking",
    "Three.js",
    "NASA",
    "Ephemeris Data",
    "Milky Way",
    "OPIC",
    "Open Integrated Cosmos",
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://opic.cxin.tech',
    title: 'OPIC — Open Integrated Cosmos',
    description: 'A web-based multi-scale universe visualization system, exploring from the solar system to the observable universe',
    siteName: 'OPIC',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const lang = await detectLanguage();
  const baseMetadata = lang === 'zh' ? metadataZh : metadataEn;
  
  return {
    ...baseMetadata,
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
    twitter: {
      card: 'summary_large_image',
      title: 'OPIC — Open Integrated Cosmos',
      description: lang === 'zh' 
        ? '一个基于 Web 的多尺度宇宙可视化与天文数据集成系统'
        : 'A web-based multi-scale universe visualization system',
    },
    icons: {
      icon: [
        { url: "/favicon.png?v=2", type: "image/png", sizes: "any" },
        { url: "/favicon.svg?v=2", type: "image/svg+xml" },
      ],
      shortcut: "/favicon.png?v=2",
      apple: "/favicon.png?v=2",
    },
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 5,
      userScalable: true,
    },
  };
}

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
        <style suppressHydrationWarning dangerouslySetInnerHTML={{__html: `
          html, body {
            background-color: #000 !important;
            margin: 0;
            padding: 0;
          }
        `}} />
      </head>
      <body
        className="antialiased"
        style={{ backgroundColor: '#000' }}
        suppressHydrationWarning
      >
        <Header />
        <LanguageDetector initialLang={lang} />
        
        {/* Dock 初始化器 */}
        <DockInitializer />
        
        {/* Dock 和窗口同步 */}
        <DockWindowSync />
        
        {/* MOD 和 Dock 同步 - 已迁移到新架构（DockInitializer） */}
        {/* <ModDockSync /> */}
        
        {children}

        {/* WindowManager - 窗口管理系统 */}
        <WindowManager />

        {/* Dock - macOS 风格任务栏 */}
        <Dock />

        {/* Vercel Analytics - 网站访问统计 */}
        <Analytics />

        {/* Vercel SpeedInsights - 性能分析 */}
        <SpeedInsights />
      </body>
    </html>
  );
}
