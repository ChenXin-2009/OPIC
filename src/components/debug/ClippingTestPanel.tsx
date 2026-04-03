/**
 * @module ClippingTestPanel
 * @description Three.js 相机近/远裁切平面（near/far）调试面板。
 *   提供多种预设裁切方案，用于解决宇宙尺度场景中深度精度不足导致的 Z-fighting 和
 *   近平面裁切穿地问题。支持动态（每帧）和静态（固定值）两类方案。
 *
 * @architecture UI 组件层（调试工具）
 *   - 依赖 Three.js PerspectiveCamera 直接修改 near/far 参数
 *   - 依赖 SceneManager 的 clippingLocked 标志防止 SceneManager 覆盖调试值
 *   - 依赖 Planet 接口获取地球网格位置
 *
 * @dependencies
 *   - `three`：PerspectiveCamera 类型
 *   - `@/lib/3d/SceneManager`：通过 clippingLocked 标志协调裁切参数控制权
 *   - `@/lib/3d/Planet`：获取地球 mesh 位置
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { SceneManager } from '@/lib/3d/SceneManager';
import type { Planet } from '@/lib/3d/Planet';

/**
 * @interface ClippingTestPanelProps
 * @description ClippingTestPanel 组件的外部传入属性。
 */
interface ClippingTestPanelProps {
  /** Three.js 透视相机的 ref，面板直接修改其 near/far 属性并调用 updateProjectionMatrix() */
  cameraRef: React.RefObject<THREE.PerspectiveCamera | null>;
  /** 太阳系行星 Map 的 ref，用于获取地球（key: 'earth'）的网格位置 */
  planetsRef: React.RefObject<Map<string, Planet>>;
  /** SceneManager 的 ref，用于设置 clippingLocked 标志以防止 SceneManager 覆盖调试值 */
  sceneManagerRef: React.RefObject<SceneManager | null>;
}

/** 地球半径（AU 单位）。换算：0.0000426 AU ≈ 6371 km（地球平均半径）。
 *  用于从相机到地球中心的距离中减去地球半径，得到到地表的距离。 */
const EARTH_RADIUS_AU = 0.0000426;

/**
 * 裁切方案列表。每个方案定义一种 near/far 设置策略，用于测试不同场景下的深度精度表现。
 * - 静态方案（dynamic: false）：一次性设置固定值，适合快速对比基准效果
 * - 动态方案（dynamic: true）：每帧根据相机到地表距离重新计算，适合贴近地表飞行场景
 */
const STRATEGIES = [
  {
    id: 'reset',
    label: '⟳ 重置（原始默认值）',
    color: '#94a3b8',
    desc: 'near=0.01 AU，far=1e12 AU（原始值，靠近时裁切）',
    // 适用场景：恢复默认值，作为其他方案的对比基准
    // 预期效果：远距离正常，靠近地表时出现近平面裁切（地球被切掉一块）
    dynamic: false,
    apply: (cam: THREE.PerspectiveCamera) => {
      cam.near = 0.01;
      cam.far = 1e12;
      cam.updateProjectionMatrix();
    },
  },
  {
    id: 'A1',
    label: 'A1. near = 距地表 × 0.1',
    color: '#60a5fa',
    desc: '每帧动态：near = distToSurface × 0.1',
    // 适用场景：中等高度飞行（数千至数万公里），near 随距离自适应
    // 预期效果：消除大部分近平面裁切，但贴近地表时 near 仍可能过大
    dynamic: true,
    apply: (cam: THREE.PerspectiveCamera, earthPos: THREE.Vector3) => {
      const d = Math.max(cam.position.distanceTo(earthPos) - EARTH_RADIUS_AU, 1e-12);
      cam.near = d * 0.1;
      cam.far = 1e12;
      cam.updateProjectionMatrix();
    },
  },
  {
    id: 'A2',
    label: 'A2. near = 距地表 × 0.01',
    color: '#38bdf8',
    desc: '每帧动态：near = distToSurface × 0.01',
    // 适用场景：低轨道飞行（数百至数千公里），near 更小，允许更近的视角
    // 预期效果：贴近地表时基本无裁切，far/near 比值约 1e14，深度精度可能不足
    dynamic: true,
    apply: (cam: THREE.PerspectiveCamera, earthPos: THREE.Vector3) => {
      const d = Math.max(cam.position.distanceTo(earthPos) - EARTH_RADIUS_AU, 1e-12);
      cam.near = d * 0.01;
      cam.far = 1e12;
      cam.updateProjectionMatrix();
    },
  },
  {
    id: 'A3',
    label: 'A3. near = 距地表 × 0.001',
    color: '#22d3ee',
    desc: '每帧动态：near = distToSurface × 0.001，贴近地表也不裁切',
    // 适用场景：极低空飞行（数十公里以内），near 极小，几乎不裁切
    // 预期效果：贴近地表无裁切，但 far/near 比值极大，需配合对数深度缓冲
    dynamic: true,
    apply: (cam: THREE.PerspectiveCamera, earthPos: THREE.Vector3) => {
      const d = Math.max(cam.position.distanceTo(earthPos) - EARTH_RADIUS_AU, 1e-12);
      cam.near = d * 0.001;
      cam.far = 1e12;
      cam.updateProjectionMatrix();
    },
  },
  {
    id: 'B1',
    label: 'B1. near = 1e-8 AU（固定）',
    color: '#a78bfa',
    desc: '固定 near = 1e-8 AU（≈1500m），依赖对数深度缓冲',
    // 适用场景：已启用对数深度缓冲（logarithmicDepthBuffer: true）的场景
    // 预期效果：固定 near 约 1500m，对数深度缓冲可覆盖大范围深度，Z-fighting 较少
    dynamic: false,
    apply: (cam: THREE.PerspectiveCamera) => {
      cam.near = 1e-8;
      cam.far = 1e12;
      cam.updateProjectionMatrix();
    },
  },
  {
    id: 'B2',
    label: 'B2. near = 1e-9 AU（更小）',
    color: '#c084fc',
    desc: '固定 near = 1e-9 AU（≈150m）',
    // 适用场景：需要更近视角的对数深度缓冲场景
    // 预期效果：near 约 150m，可飞入城市级别高度，需对数深度缓冲支撑
    dynamic: false,
    apply: (cam: THREE.PerspectiveCamera) => {
      cam.near = 1e-9;
      cam.far = 1e12;
      cam.updateProjectionMatrix();
    },
  },
  {
    id: 'B3',
    label: 'B3. near = 1e-10 AU（极限）',
    color: '#e879f9',
    desc: '固定 near = 1e-10 AU（≈15m），对数深度缓冲极限测试',
    // 适用场景：测试对数深度缓冲的极限能力
    // 预期效果：near 约 15m，接近地面级别，far/near ≈ 1e22，仅对数深度缓冲可用
    dynamic: false,
    apply: (cam: THREE.PerspectiveCamera) => {
      cam.near = 1e-10;
      cam.far = 1e12;
      cam.updateProjectionMatrix();
    },
  },
  {
    id: 'C1',
    label: 'C1. far 缩小到 1e6 AU',
    color: '#fb923c',
    desc: 'near=0.01 不变，far=1e6，far/near=1e8，减少精度压力',
    // 适用场景：不需要渲染超远距离天体（如银河系外）的场景
    // 预期效果：far/near 比值从 1e14 降至 1e8，深度精度显著提升，Z-fighting 减少
    dynamic: false,
    apply: (cam: THREE.PerspectiveCamera) => {
      cam.near = 0.01;
      cam.far = 1e6;
      cam.updateProjectionMatrix();
    },
  },
  {
    id: 'D1',
    label: 'D1. 动态 near+far 双向收紧',
    color: '#4ade80',
    desc: '每帧动态：near=distToSurface×0.01，far=max(1e6, distToSun×10)',
    // 适用场景：需要同时保证近处无裁切和远处深度精度的综合场景
    // 预期效果：near 和 far 均随相机位置动态调整，far/near 比值相对稳定
    dynamic: true,
    apply: (cam: THREE.PerspectiveCamera, earthPos: THREE.Vector3) => {
      const d = Math.max(cam.position.distanceTo(earthPos) - EARTH_RADIUS_AU, 1e-12);
      cam.near = d * 0.01;
      cam.far = Math.max(1e6, cam.position.length() * 10);
      cam.updateProjectionMatrix();
    },
  },
  {
    id: 'D2',
    label: 'D2. 保持 far/near ≤ 1e8',
    color: '#86efac',
    desc: '每帧动态：near=distToSurface×0.01，far=near×1e8',
    // 适用场景：对深度精度要求严格的场景，强制将 far/near 比值控制在 1e8 以内
    // 预期效果：深度精度最优，但 far 随 near 缩小，远处天体可能被裁切
    dynamic: true,
    apply: (cam: THREE.PerspectiveCamera, earthPos: THREE.Vector3) => {
      const d = Math.max(cam.position.distanceTo(earthPos) - EARTH_RADIUS_AU, 1e-12);
      const near = d * 0.01;
      cam.near = near;
      cam.far = near * 1e8;
      cam.updateProjectionMatrix();
    },
  },
];

/**
 * 裁切测试面板组件
 *
 * 调试工具，用于测试和比较不同的 Three.js 相机近/远裁切平面策略。
 * 实时显示相机到地球的距离、当前 near/far 值及其比值，
 * 并允许一键切换预设的裁切方案（STRATEGIES）。
 *
 * @param props - 组件属性
 * @param props.cameraRef - Three.js 相机引用
 * @param props.planetsRef - 行星对象 Map 引用，用于获取地球位置
 * @param props.sceneManagerRef - 场景管理器引用，用于应用裁切策略
 */
export default function ClippingTestPanel({ cameraRef, planetsRef, sceneManagerRef }: ClippingTestPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeId, setActiveId] = useState('reset');
  const [liveInfo, setLiveInfo] = useState({ distKm: 0, near: 0, far: 0, ratio: 0 });
  const rafRef = useRef<number | null>(null);

  // 获取地球位置的辅助函数
  const getEarthPos = useCallback((): THREE.Vector3 => {
    const earth = planetsRef.current?.get('earth');
    return (earth as any)?.getMesh?.()?.position ?? new THREE.Vector3();
  }, [planetsRef]);

  // 执行方案
  const applyStrategy = useCallback((id: string) => {
    const cam = cameraRef.current;
    if (!cam) {
      console.warn('[ClippingTestPanel] camera not ready yet');
      return;
    }
    const s = STRATEGIES.find(s => s.id === id);
    if (!s) return;

    // 锁定/解锁 SceneManager 的 clipping 覆盖
    // clippingLocked = true 时，SceneManager 的自动 near/far 更新逻辑将跳过，
    // 确保调试面板设置的值不被 SceneManager 每帧覆盖；
    // 选择 'reset' 方案时解锁，恢复 SceneManager 的正常控制权。
    const sm = sceneManagerRef.current as any;
    if (sm) sm.clippingLocked = id !== 'reset';

    s.apply(cam, getEarthPos());
    setActiveId(id);
  }, [cameraRef, sceneManagerRef, getEarthPos]);

  // 动态方案：每帧持续应用
  useEffect(() => {
    const active = STRATEGIES.find(s => s.id === activeId);
    if (!active?.dynamic) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const loop = () => {
      const cam = cameraRef.current;
      if (cam) active.apply(cam, getEarthPos());
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [activeId, cameraRef, getEarthPos]);

  // 实时状态读取
  useEffect(() => {
    const interval = setInterval(() => {
      const cam = cameraRef.current;
      if (!cam) return;
      const earthPos = getEarthPos();
      const distToCenter = cam.position.distanceTo(earthPos);
      const distToSurface = Math.max(distToCenter - EARTH_RADIUS_AU, 0);
      setLiveInfo({
        distKm: distToSurface * 149597870.7,
        near: cam.near,
        far: cam.far,
        ratio: cam.near > 0 ? cam.far / cam.near : 0,
      });
    }, 150);
    return () => clearInterval(interval);
  }, [cameraRef, getEarthPos]);

  // nearWarn：当 near 平面距离（换算为 km）大于相机到地表距离时触发，
  // 说明近平面已超过地表，相机视锥体将裁切掉地球表面，出现"穿地"现象。
  const nearWarn = liveInfo.near > 0 && liveInfo.distKm > 0 && liveInfo.near * 149597870700 > liveInfo.distKm * 1000;
  // ratioWarn：当 far/near 比值超过 1e7 时触发，
  // 说明深度缓冲精度不足（标准 24 位深度缓冲的有效比值上限约为 1e7），
  // 可能导致远处物体出现 Z-fighting（深度闪烁）。
  const ratioWarn = liveInfo.ratio > 1e7;

  if (collapsed) {
    return (
      <div style={{ position: 'fixed', left: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 9999 }}>
        <button onClick={() => setCollapsed(false)} style={{ background: 'rgba(8,12,24,0.92)', border: '1px solid rgba(100,160,255,0.4)', borderRadius: '6px', color: '#60a5fa', cursor: 'pointer', padding: '6px 10px', fontSize: '11px', fontFamily: 'monospace' }}>
          ✂️
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', left: '10px', top: '50%', transform: 'translateY(-50%)',
      width: '268px', maxHeight: '88vh', overflowY: 'auto',
      background: 'rgba(8,12,24,0.95)', border: '1px solid rgba(100,160,255,0.3)',
      borderRadius: '8px', padding: '10px', fontFamily: 'monospace', fontSize: '11px',
      color: '#ccc', zIndex: 9999, backdropFilter: 'blur(8px)', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
        <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>✂️ 裁切方案测试</span>
        <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '13px' }}>◀</button>
      </div>

      {/* 实时状态 */}
      <div style={{ marginBottom: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', padding: '6px', fontSize: '10px' }}>
        <Row label="到地表" value={`${liveInfo.distKm.toFixed(0)} km`} warn={liveInfo.distKm < 50000} />
        <Row label="camera.near" value={liveInfo.near.toExponential(2)} warn={nearWarn} />
        <Row label="camera.far" value={liveInfo.far.toExponential(2)} />
        <Row label="far/near" value={liveInfo.ratio.toExponential(2)} warn={ratioWarn} />
        {nearWarn && <div style={{ color: '#f87171', marginTop: '3px', fontSize: '10px' }}>⚠ near &gt; 到地表距离 → 裁切！</div>}
        {ratioWarn && <div style={{ color: '#fbbf24', marginTop: '3px', fontSize: '10px' }}>⚠ far/near &gt; 1e7 → 深度精度不足</div>}
      </div>

      <div style={{ color: '#475569', fontSize: '10px', marginBottom: '5px' }}>点击立即应用 · 标 ⟳ 的每帧持续更新</div>

      {STRATEGIES.map(s => {
        const isActive = activeId === s.id;
        return (
          <div key={s.id} style={{ marginBottom: '3px' }}>
            <button
              onClick={() => applyStrategy(s.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '5px 8px',
                background: isActive ? `${s.color}20` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? s.color + '88' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '4px', cursor: 'pointer',
                color: isActive ? s.color : '#aaa',
                fontSize: '11px', fontFamily: 'monospace',
              }}
            >
              {s.dynamic ? '⟳ ' : '  '}{s.label.replace(/^[⟳] /, '')}
            </button>
            {isActive && (
              <div style={{ padding: '3px 8px 4px', fontSize: '10px', color: '#64748b', lineHeight: '1.5' }}>
                {s.desc}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
      <span style={{ color: '#475569' }}>{label}:</span>
      <span style={{ color: warn ? '#f87171' : '#e2e8f0' }}>{value}</span>
    </div>
  );
}
