/**
 * PerformanceSettings — 用户端性能配置面板
 *
 * 允许用户调整以下画质选项：
 * - 画质档位（低/中/高/自动）
 * - Cesium 3D 地球开关
 * - 粒子效果
 * - 标签密度
 * - 纹理分辨率
 *
 * 设置保存在 localStorage，下次访问自动恢复。
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';

export type QualityPreset = 'low' | 'medium' | 'high' | 'auto';

interface PerfSettings {
  qualityPreset: QualityPreset;
  cesiumEnabled: boolean;
  particlesEnabled: boolean;
  labelDensity: 'all' | 'selected' | 'minimal';
  textureResolution: 'full' | 'half' | 'quarter';
}

const STORAGE_KEY = 'opic-perf-settings';

const DEFAULT_SETTINGS: PerfSettings = {
  qualityPreset: 'auto',
  cesiumEnabled: true,  // 默认开启 Cesium 3D 地球
  particlesEnabled: true,
  labelDensity: 'all',
  textureResolution: 'full',
};

function loadSettings(): PerfSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: PerfSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function usePerformanceSettings() {
  const [settings, setSettings] = useState<PerfSettings>(loadSettings);

  const updateSettings = useCallback((partial: Partial<PerfSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}

interface PerformanceSettingsProps {
  settings: PerfSettings;
  onUpdate: (partial: Partial<PerfSettings>) => void;
  onClose: () => void;
}

export function PerformanceSettingsPanel({ settings, onUpdate, onClose }: PerformanceSettingsProps) {
  return (
    <div
      className="rounded-lg overflow-hidden shadow-2xl"
      style={{
        width: '280px',
        backgroundColor: 'rgba(15, 15, 25, 0.94)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#ccc',
      }}
    >
      {/* 标题 */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      >
        <span style={{ color: '#88ccff', fontWeight: 'bold', fontSize: '13px' }}>
          性能设置
        </span>
        <button
          onClick={onClose}
          aria-label="关闭"
          style={{
            background: 'none', border: 'none', color: '#888',
            cursor: 'pointer', fontSize: '16px', padding: '0 4px',
          }}
        >
          ×
        </button>
      </div>

      {/* 画质档位 */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="mb-2" style={{ color: '#888' }}>画质档位</div>
        <div className="flex gap-1">
          {(['auto', 'low', 'medium', 'high'] as QualityPreset[]).map(preset => (
            <button
              key={preset}
              onClick={() => onUpdate({ qualityPreset: preset })}
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: '4px',
                border: settings.qualityPreset === preset
                  ? '1px solid rgba(100,180,255,0.5)'
                  : '1px solid rgba(255,255,255,0.1)',
                backgroundColor: settings.qualityPreset === preset
                  ? 'rgba(100,180,255,0.15)'
                  : 'transparent',
                color: settings.qualityPreset === preset ? '#88ccff' : '#888',
                cursor: 'pointer',
                fontSize: '11px',
                transition: 'all 0.15s',
              }}
            >
              {{ auto: '自动', low: '低', medium: '中', high: '高' }[preset]}
            </button>
          ))}
        </div>
      </div>

      {/* 开关选项 */}
      <div className="px-3 py-2 space-y-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <ToggleRow
          label="3D 地球 (Cesium)"
          description="缩放到地球附近时显示高清3D地球模型"
          enabled={settings.cesiumEnabled}
          onChange={(v) => onUpdate({ cesiumEnabled: v })}
        />
        <ToggleRow
          label="粒子效果"
          description="太阳光晕、星尘等视觉效果"
          enabled={settings.particlesEnabled}
          onChange={(v) => onUpdate({ particlesEnabled: v })}
        />
      </div>

      {/* 标签密度 */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <label className="mb-2" style={{ color: '#888', display: 'block' }}>标签密度</label>
        <select
          value={settings.labelDensity}
          onChange={(e) => onUpdate({ labelDensity: e.target.value as PerfSettings['labelDensity'] })}
          aria-label="标签密度"
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(0,0,0,0.3)',
            color: '#ccc',
            fontSize: '11px',
          }}
        >
          <option value="all">全部显示</option>
          <option value="selected">仅选中天体</option>
          <option value="minimal">最小化（仅太阳）</option>
        </select>
      </div>

      {/* 纹理分辨率 */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <label className="mb-2" style={{ color: '#888', display: 'block' }}>纹理分辨率</label>
        <select
          value={settings.textureResolution}
          onChange={(e) => onUpdate({ textureResolution: e.target.value as PerfSettings['textureResolution'] })}
          aria-label="纹理分辨率"
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(0,0,0,0.3)',
            color: '#ccc',
            fontSize: '11px',
          }}
        >
          <option value="full">完整</option>
          <option value="half">1/2</option>
          <option value="quarter">1/4</option>
        </select>
      </div>

      {/* 提示 */}
      <div className="px-3 py-2 text-center" style={{ color: '#999', fontSize: '10px' }}>
        设置自动保存到本地浏览器
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div style={{ color: '#ccc' }}>{label}</div>
        <div style={{ color: '#999', fontSize: '10px' }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        aria-label={label}
        style={{
          width: '36px',
          height: '20px',
          borderRadius: '10px',
          border: 'none',
          backgroundColor: enabled ? 'rgba(100,180,255,0.5)' : 'rgba(255,255,255,0.1)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
      >
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            position: 'absolute',
            top: '2px',
            left: enabled ? '18px' : '2px',
            transition: 'left 0.2s',
          }}
        />
      </button>
    </div>
  );
}

export default PerformanceSettingsPanel;
