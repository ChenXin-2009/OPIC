/**
 * SpaceLaunchWindow.tsx - 商业航天发射追踪窗口
 */

'use client';

import { useState, useEffect } from 'react';
import SpaceLaunchPanel from '../space-launches/SpaceLaunchPanel';
import { rendererStore } from '@/lib/mods/rendererStore';

interface SpaceLaunchWindowProps {
  lang?: 'zh' | 'en';
}

export function SpaceLaunchWindow({ lang = 'zh' }: SpaceLaunchWindowProps) {
  const [renderer, setRenderer] = useState(rendererStore.getSpaceLaunchesRenderer());

  // 定期检查renderer是否已创建
  useEffect(() => {
    const interval = setInterval(() => {
      const r = rendererStore.getSpaceLaunchesRenderer();
      if (r !== renderer) {
        setRenderer(r);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [renderer]);

  return (
    <div className="h-full bg-white/5">
      <SpaceLaunchPanel lang={lang} asWindowContent={true} renderer={renderer} />
    </div>
  );
}
