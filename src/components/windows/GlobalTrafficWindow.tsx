/**
 * GlobalTrafficWindow.tsx - 全球货运与贸易路线窗口
 */

'use client';

import { useState, useEffect } from 'react';
import { useModStore } from '@/lib/mod-manager/store';
import { GlobalTrafficPanel } from '../global-traffic/GlobalTrafficPanel';
import type { GlobalTrafficConfig } from '@/lib/mods/global-traffic/types';
import { rendererStore } from '@/lib/mods/rendererStore';

interface GlobalTrafficWindowProps {
  lang?: 'zh' | 'en';
}

export function GlobalTrafficWindow({ lang = 'zh' }: GlobalTrafficWindowProps) {
  const modConfig = useModStore(s => s.mods['global-traffic']?.config);
  const setModConfig = useModStore(s => s.setModConfig);
  const [renderer, setRenderer] = useState(rendererStore.getGlobalTrafficRenderer());

  // 定期检查renderer是否已创建
  useEffect(() => {
    const interval = setInterval(() => {
      const r = rendererStore.getGlobalTrafficRenderer();
      if (r !== renderer) {
        setRenderer(r);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [renderer]);

  return (
    <div className="h-full bg-white/5">
      <GlobalTrafficPanel
        renderer={renderer}
        lang={lang}
        onClose={() => {}}
        initialConfig={modConfig as Partial<GlobalTrafficConfig>}
        onConfigChange={cfg => setModConfig('global-traffic', cfg as unknown as Record<string, unknown>)}
        asWindowContent={true}
      />
    </div>
  );
}
