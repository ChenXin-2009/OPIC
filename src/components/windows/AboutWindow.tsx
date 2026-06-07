/**
 * AboutWindow.tsx - macOS 风格关于窗口
 * 
 * 显示应用信息、版本、作者等
 */

'use client';
import AboutContent from '../AboutContent';
interface AboutWindowProps {
  lang?: 'zh' | 'en';
}

export function AboutWindow({ lang: _lang = 'zh' }: AboutWindowProps) {

  return (
    <div className="h-full overflow-auto bg-white/5">
      {/* 标题区域 */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-blue-500" />
          <h2 className="text-2xl font-light text-white tracking-wider">
            OPIC
          </h2>
        </div>
        <div className="ml-4 pl-3 border-l border-white/20">
          <p className="text-sm text-white/50 tracking-wide">
            OPEN INTEGRATED COSMOS
          </p>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        <AboutContent />
      </div>
    </div>
  );
}
