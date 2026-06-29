/**
 * MoonWindow.tsx — 月球探索窗口包装器
 *
 * 遵循 MOD 窗口标准模式：
 * - WindowManager 通过 openWindow({ content: <MoonWindow/> }) 渲染
 * - 内部嵌入 MoonPanel 显示实际内容
 */

'use client';

import { MoonPanel } from '../moon/MoonPanel';

interface MoonWindowProps {
  lang?: 'zh' | 'en';
}

export function MoonWindow({ lang = 'zh' }: MoonWindowProps) {
  return (
    <div className="h-full bg-white/5">
      <MoonPanel lang={lang} asWindowContent={true} />
    </div>
  );
}
