'use client';

import { useEffect, useState } from 'react';
import type { SceneManager } from '@/lib/3d/SceneManager';

interface GridScaleRulerProps {
  sceneManager: SceneManager | null;
}

/**
 * GridScaleRuler - 太阳系参考网格比例尺
 * 在恒星层级显示，标注当前网格间距
 */
export default function GridScaleRuler({ sceneManager }: GridScaleRulerProps) {
  const [label, setLabel] = useState('');
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!sceneManager) return;

    // 使用节流更新（每 500ms）替代 requestAnimationFrame 轮询
    // 减少不必要的每秒 60 次调用
    let intervalId: ReturnType<typeof setInterval>;
    const tick = () => {
      const info = sceneManager.getGridInfo();
      if (info && info.opacity > 0.01 && info.label) {
        setLabel(info.label);
        setOpacity(info.opacity);
      } else {
        setOpacity(0);
      }
    };

    // 初始更新
    tick();
    // 节流更新 - 500ms 对于比例尺更新足够了
    intervalId = setInterval(tick, 500);

    return () => clearInterval(intervalId);
  }, [sceneManager]);

  if (opacity < 0.01) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        opacity,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      {/* 比例尺线条 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {/* 左端竖线 */}
        <div style={{ width: 1, height: 8, background: 'rgba(100,180,255,0.8)' }} />
        {/* 横线 */}
        <div style={{ width: 120, height: 1, background: 'rgba(100,180,255,0.8)' }} />
        {/* 右端竖线 */}
        <div style={{ width: 1, height: 8, background: 'rgba(100,180,255,0.8)' }} />
      </div>
      {/* 标签 */}
      <div
        style={{
          color: 'rgba(140,200,255,0.9)',
          fontSize: '11px',
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '0.05em',
          textShadow: '0 0 6px rgba(0,100,200,0.8)',
          whiteSpace: 'nowrap',
        }}
      >
        {label} / 格
      </div>
    </div>
  );
}
