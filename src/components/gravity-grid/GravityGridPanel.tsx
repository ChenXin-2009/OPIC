'use client';

import React from 'react';
import type { GridConfig, GizmoMode } from '@/lib/mods/gravity-grid/GravityFieldCalculator';
import { DEFAULT_GRID_CONFIG, ALL_BODY_IDS } from '@/lib/mods/gravity-grid/GravityFieldCalculator';
import { getGravitationalParameterAU } from '@/lib/3d/player/gravity';
import { CELESTIAL_BODIES } from '@/lib/types/celestialTypes';

interface GravityGridPanelProps {
  config?: GridConfig;
  onConfigChange: (config: GridConfig) => void;
  cameraDistance?: number;
}

const anchorOptions = ['none', ...ALL_BODY_IDS.filter(id => {
  const p = CELESTIAL_BODIES[id];
  return !p?.isSatellite;
})];

function bodyLabel(id: string): string {
  if (id === 'none') return '无 (绝对)';
  const cfg = CELESTIAL_BODIES[id];
  return cfg?.name || id;
}

const btnBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '36px', height: '36px', border: '1px solid #4a5568',
  borderRadius: '6px', background: '#2d3748', cursor: 'pointer',
  fontSize: '16px', color: '#a0aec0', transition: 'all 0.15s',
};

const btnActive: React.CSSProperties = {
  ...btnBase, background: '#2b6cb0', border: '1px solid #4299e1', color: '#fff',
};

const sliderStyle: React.CSSProperties = {
  width: '100%', height: '4px', appearance: 'none',
  background: '#4a5568', borderRadius: '2px', outline: 'none', cursor: 'pointer',
};

export function GravityGridPanel({ config, onConfigChange }: GravityGridPanelProps) {
  const cfg = config || DEFAULT_GRID_CONFIG;

  const set = (key: keyof GridConfig, value: number | string) => {
    onConfigChange({ ...cfg, [key]: value });
  };

  const gizmoButtons: { mode: GizmoMode; icon: string; label: string }[] = [
    { mode: 'none', icon: '✋', label: '无 Gizmo' },
    { mode: 'translate', icon: '↕', label: '移动 (T)' },
    { mode: 'rotate', icon: '↻', label: '旋转 (R)' },
  ];

  const isBodySelected = (id: string): boolean => {
    if (cfg.detectedBodies.length === 0) return true;
    return cfg.detectedBodies.includes(id);
  };

  const toggleBody = (id: string) => {
    const current = cfg.detectedBodies.length === 0 ? [...ALL_BODY_IDS] : cfg.detectedBodies;
    const next = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    onConfigChange({ ...cfg, detectedBodies: next.length === 0 ? [] : next });
  };

  const allSelected = cfg.detectedBodies.length === 0 || cfg.detectedBodies.length === ALL_BODY_IDS.length;

  return (
    <div style={{ color: '#e2e8f0', fontSize: '13px', userSelect: 'none' }}>

      {/* Gizmo Mode + Anchor row */}
      <Section title="3D 操纵 (Gizmo)">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          {gizmoButtons.map(b => (
            <button key={b.mode}
              onClick={() => set('gizmoMode', b.mode)}
              title={b.label}
              style={cfg.gizmoMode === b.mode ? btnActive : btnBase}>
              {b.icon}
            </button>
          ))}
          <div style={{ flex: 1, marginLeft: '8px' }}>
            <Label>锚定</Label>
            <select value={cfg.anchorBody}
              onChange={e => set('anchorBody', e.target.value)}
              style={{
                width: '100%', background: '#2d3748', color: '#fff',
                padding: '4px 8px', borderRadius: '4px',
                border: '1px solid #4a5568', fontSize: '12px',
              }}>
              {anchorOptions.map(id => (
                <option key={id} value={id}>{bodyLabel(id)}</option>
              ))}
            </select>
          </div>
        </div>
        <Hint>点击 Gizmo 按钮后，在 3D 场景中拖拽箭头（移动）或圆环（旋转）来调整切面</Hint>
      </Section>

      {/* Detected Bodies */}
      <Section title="检测天体">
        <div style={{ marginBottom: '6px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#a0aec0' }}>
            <input type="checkbox" checked={allSelected}
              onChange={() => {
                onConfigChange({ ...cfg, detectedBodies: allSelected ? [] : [...ALL_BODY_IDS] });
              }} />
            全选 ({ALL_BODY_IDS.length})
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px', maxHeight: '120px', overflowY: 'auto' }}>
          {ALL_BODY_IDS.map(id => (
            <label key={id} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px', color: '#cbd5e0' }}>
              <input type="checkbox" checked={isBodySelected(id)}
                onChange={() => toggleBody(id)} />
              {bodyLabel(id)}
            </label>
          ))}
        </div>
        <Hint>取消勾选的天体不参与引力计算</Hint>
      </Section>

      {/* Position Offset — collapsed when gizmo active */}
      <Section title="位置偏移 (AU)">
        {(['posX', 'posY', 'posZ'] as const).map(axis => (
          <SliderRow key={axis} label={`${axis.slice(-1).toUpperCase()}:`}
            value={cfg[axis]} min={-0.5} max={0.5} step={0.001}
            onChange={v => set(axis, v)} format={v => v.toFixed(3)} />
        ))}
      </Section>

      {/* Rotation — collapsed when gizmo active */}
      <Section title="旋转角度 (°)">
        {(['rotX', 'rotY', 'rotZ'] as const).map(axis => (
          <SliderRow key={axis} label={`${axis.slice(-1).toUpperCase()}轴:`}
            value={cfg[axis]} min={-180} max={180} step={1}
            onChange={v => set(axis, v)} format={v => `${v}°`} />
        ))}
      </Section>

      {/* Scale */}
      <Section title="切面尺度 (AU)">
        <SliderRow label="X 跨度:" value={cfg.scaleX} min={0.001} max={10000} step={0.001}
          onChange={v => set('scaleX', v)} format={v => v.toFixed(3)} />
        <SliderRow label="Y 跨度:" value={cfg.scaleY} min={0.001} max={10000} step={0.001}
          onChange={v => set('scaleY', v)} format={v => v.toFixed(3)} />
      </Section>

      {/* Grid Params */}
      <Section title="网格参数">
        <SliderRow label="分段数:" value={cfg.segments} min={4} max={1024} step={1}
          onChange={v => set('segments', v)} format={v => `${v}×${v}`} />
        <SliderRow label="夸张系数:" value={cfg.exaggeration} min={1} max={200} step={1}
          onChange={v => set('exaggeration', v)} format={v => `${v}`} />
        <SliderRow label="透明度:" value={cfg.opacity} min={0.05} max={1} step={0.05}
          onChange={v => set('opacity', v)} format={v => v.toFixed(2)} />
      </Section>

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{
        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: '#a0aec0', marginBottom: '6px',
        borderBottom: '1px solid #2d3748', paddingBottom: '4px',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>{children}</div>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '11px', color: '#718096', marginTop: '4px', fontStyle: 'italic' }}>{children}</div>;
}

function SliderRow({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [textVal, setTextVal] = React.useState('');
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', gap: '8px' }}>
      <div style={{ width: '60px', flexShrink: 0, color: '#a0aec0', fontSize: '12px' }}>{label}</div>
      <div style={{ flex: 1 }}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))} style={sliderStyle} />
      </div>
      {editing ? (
        <input type="text" value={textVal}
          onChange={e => setTextVal(e.target.value)}
          onBlur={() => {
            const v = parseFloat(textVal);
            if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
            setEditing(false);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const v = parseFloat(textVal);
              if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
              setEditing(false);
            }
            if (e.key === 'Escape') setEditing(false);
          }}
          autoFocus
          style={{
            width: '80px', textAlign: 'right', fontSize: '12px', fontFamily: 'monospace',
            background: '#1a202c', color: '#e2e8f0', border: '1px solid #4299e1',
            borderRadius: '4px', padding: '2px 6px', outline: 'none',
          }} />
      ) : (
        <div style={{ width: '80px', textAlign: 'right', fontSize: '12px', fontFamily: 'monospace', color: '#e2e8f0', cursor: 'text' }}
          onClick={() => { setTextVal(format(value)); setEditing(true); }}>
          {format(value)}
        </div>
      )}
    </div>
  );
}
