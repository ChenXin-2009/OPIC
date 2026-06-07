/**
 * WeatherDisasterWindow.tsx - 气象灾害监测窗口
 */

'use client';

import { useState, useEffect } from 'react';
import { useModStore } from '@/lib/mod-manager/store';
import { WeatherDisasterPanel } from '../weather-disaster/WeatherDisasterPanel';
import type { DataSourceId } from '@/lib/mods/weather-disaster/useDisasterData';
import { rendererStore } from '@/lib/mods/rendererStore';

interface WeatherDisasterWindowProps {
  lang?: 'zh' | 'en';
}

export function WeatherDisasterWindow({ lang = 'zh' }: WeatherDisasterWindowProps) {
  const modConfig = useModStore(s => s.mods['weather-disaster']?.config);
  const setModConfig = useModStore(s => s.setModConfig);
  const [renderer, setRenderer] = useState(rendererStore.getWeatherDisasterRenderer());

  // 定期检查renderer是否已创建
  useEffect(() => {
    const interval = setInterval(() => {
      const r = rendererStore.getWeatherDisasterRenderer();
      if (r !== renderer) {
        setRenderer(r);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [renderer]);

  return (
    <div className="h-full bg-white/5">
      <WeatherDisasterPanel
        renderer={renderer}
        onClose={() => {}}
        initialConfig={modConfig as { enabledSources?: DataSourceId[]; opacity?: number; hiddenCategories?: string[] }}
        onConfigChange={cfg => setModConfig('weather-disaster', cfg as Record<string, unknown>)}
        asWindowContent={true}
        lang={lang}
      />
    </div>
  );
}
