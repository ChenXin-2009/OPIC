'use client';

import { useModStore } from '@/lib/mod-manager/store';
import { getEventBus } from '@/lib/mod-manager/core/EventBus';
import { GravityGridPanel } from '../gravity-grid/GravityGridPanel';
import { DEFAULT_GRID_CONFIG, type GridConfig } from '@/lib/mods/gravity-grid/GravityFieldCalculator';

interface GravityGridWindowProps {
  lang?: 'zh' | 'en';
}

export function GravityGridWindow({ lang = 'zh' }: GravityGridWindowProps) {
  const modState = useModStore(s => s.mods['gravity-grid']);
  const modConfig = (modState?.modState as { config?: GridConfig })?.config;

  const handleConfigChange = (newConfig: GridConfig) => {
    const eventBus = getEventBus();
    eventBus.emit('gravity-grid:update', newConfig);
  };

  return (
    <div className="h-full overflow-y-auto" style={{
      background: '#1a202c',
      padding: '16px',
    }}>
      <GravityGridPanel
        config={modConfig || DEFAULT_GRID_CONFIG}
        onConfigChange={handleConfigChange}
      />
    </div>
  );
}
