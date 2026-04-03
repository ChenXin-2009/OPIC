/**
 * @module CesiumMapSourcePanel
 * @description Cesium 地图影像源切换面板组件
 *
 * 架构层级：UI 层 → Cesium 子系统
 * 职责：提供用户界面，允许在运行时动态切换 Cesium 地球的底图影像源（卫星图、地形图、实时云图等）。
 * 依赖：
 *   - `@/lib/cesium/imageryProviders`：影像源定义与分类数据
 *   - `earthPlanet` prop：通过 `getCesiumExtension()` 获取 Cesium 扩展实例，调用 `setImageryProvider`
 * 与 Three.js 的集成关系：本组件仅操作 Cesium 影像层，不直接与 Three.js 交互；
 *   地球对象由父组件统一管理，通过 prop 传入。
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { IMAGERY_SOURCES, IMAGERY_CATEGORIES, ImageryCategory, ImagerySourceDef } from '@/lib/cesium/imageryProviders';

/**
 * CesiumMapSourcePanel 组件的 Props 接口
 */
interface CesiumMapSourcePanelProps {
  /** Cesium 地球对象实例，需实现 `getCesiumExtension()` 方法；未传入时面板禁用切换功能 */
  earthPlanet?: any;
  /** 控制面板是否可见；默认为 `true` */
  visible?: boolean;
}

/** 面板 UI 配色方案，采用深色科技风格 */
const COLORS = {
  dark: '#0a0a0a',
  darkLight: '#1a1a1a',
  border: '#333333',
  primary: '#ffffff',
  textDim: '#999999',
  accent: '#4a9eff',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
};

/**
 * 影像源预览缩略图子组件
 *
 * 负责加载并展示影像源的预览图片，内置三态（加载中 / 成功 / 失败）处理：
 * - 加载中：显示省略号占位符
 * - 加载失败：显示红色 ✕ 图标
 * - 加载成功：显示实际图片
 *
 * @param src - 预览图片的 URL
 * @param alt - 图片的替代文本，用于无障碍访问
 */
function PreviewImage({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  return (
    <div style={{
      width: 64, height: 44, flexShrink: 0,
      borderRadius: 2, overflow: 'hidden',
      backgroundColor: COLORS.darkLight,
      border: `1px solid ${COLORS.border}`,
      position: 'relative',
    }}>
      {status !== 'ok' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: status === 'error' ? COLORS.error : COLORS.border,
          fontSize: 10,
        }}>
          {status === 'error' ? '✕' : '…'}
        </div>
      )}
      <img
        src={src} alt={alt}
        onLoad={() => setStatus('ok')}
        onError={() => setStatus('error')}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: status === 'ok' ? 'block' : 'none' }}
      />
    </div>
  );
}

/**
 * Cesium 地图图源选择面板组件
 *
 * 提供地图影像图源的切换界面，支持：
 * - 图源列表展示（含预览图、名称、描述）
 * - 图源切换（异步加载，带加载状态和错误提示）
 * - 面板折叠/展开
 *
 * @param props - 组件属性
 * @param props.earthPlanet - Cesium 地球扩展实例，用于切换影像图层
 * @param props.visible - 是否显示面板，默认为 true
 */
export default function CesiumMapSourcePanel({ earthPlanet, visible = true }: CesiumMapSourcePanelProps) {
  const [activeId, setActiveId] = useState<string>('bing-default');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  /**
   * 错误提示定时器引用
   * 用于自动清除错误提示：每次显示新错误时先取消上一个定时器，
   * 再设置 4000ms 后自动将 error 状态置为 null，避免错误信息长期残留。
   */
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((msg: string) => {
    setError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 4000);
  }, []);

  /**
   * 应用指定影像源到 Cesium 地球
   *
   * 调用影像源的 `create()` 工厂方法异步创建 Provider 实例，
   * 再通过 Cesium 扩展的 `setImageryProvider` 切换底图。
   *
   * @param source - 要应用的影像源定义对象
   * @param silent - 为 `true` 时静默执行（不更新 loading 状态、不显示错误提示），
   *                 用于初始化时的默认源加载
   * @sideEffects 更新 `loading`、`activeId`、`error` 状态；调用 Cesium 扩展切换底图
   */
  const applySource = useCallback(async (source: ImagerySourceDef, silent = false) => {
    const ext = earthPlanet?.getCesiumExtension?.();
    if (!ext) return;
    if (!silent) setLoading(source.id);
    setError(null);
    try {
      const provider = await source.create();
      if (provider !== null) ext.setImageryProvider(provider);
      setActiveId(source.id);
    } catch (e: any) {
      if (!silent) showError(`加载失败：${source.name}（${e?.message ?? '网络错误'}）`);
    } finally {
      if (!silent) setLoading(null);
    }
  }, [earthPlanet, showError]);

  /**
   * 处理用户点击影像源列表项的选择事件
   *
   * 防止在 `earthPlanet` 未就绪或已有影像源正在加载时重复触发切换。
   *
   * @param source - 用户选中的影像源定义对象
   * @sideEffects 调用 `applySource` 触发底图切换流程
   */
  const handleSelect = useCallback(async (source: ImagerySourceDef) => {
    if (!earthPlanet || loading) return;
    await applySource(source);
  }, [earthPlanet, loading, applySource]);

  if (!visible) return null;

  const categories = Object.keys(IMAGERY_CATEGORIES) as ImageryCategory[];

  return (
    <div style={{
      position: 'fixed',
      right: 220,  /* 右侧按钮组宽约 200px，留 20px 间距 */
      bottom: 80,
      width: isCollapsed ? 140 : 300,
      background: COLORS.dark,
      border: `2px solid ${COLORS.border}`,
      clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      color: COLORS.primary,
      fontFamily: 'system-ui, sans-serif',
      zIndex: 1000,
      transition: 'width 0.2s ease',
    }}>
      {/* 左上角切角装饰 */}
      <div style={{
        position: 'absolute', top: -1, left: -1,
        width: 12, height: 12,
        background: COLORS.primary,
        clipPath: 'polygon(0 0, 100% 0, 0 100%)',
      }} />
      {/* 右下角切角装饰 */}
      <div style={{
        position: 'absolute', bottom: -1, right: -1,
        width: 12, height: 12,
        background: COLORS.primary,
        clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
      }} />

      {/* 标题栏 */}
      <div
        onClick={() => setIsCollapsed(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          borderBottom: isCollapsed ? 'none' : `1px solid ${COLORS.border}`,
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        {/* 左侧色条 */}
        <div style={{ width: 3, height: 16, background: COLORS.accent, flexShrink: 0 }} />
        <span style={{ color: COLORS.primary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>
          地图源
        </span>
        <span style={{ color: COLORS.textDim, fontSize: 11 }}>{isCollapsed ? '▲' : '▼'}</span>
      </div>

      {!isCollapsed && (
        <>
          {/* 错误提示 */}
          {error && (
            <div style={{
              margin: '8px 12px 0',
              padding: '7px 10px',
              background: 'rgba(248,113,113,0.1)',
              border: `1px solid rgba(248,113,113,0.35)`,
              clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              color: COLORS.error,
              fontSize: 12,
              lineHeight: 1.4,
            }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ overflowY: 'auto', maxHeight: 440, paddingBottom: 8 }}
            className="satellite-menu-scrollbar"
          >
            {categories.map((cat, catIdx) => {
              const sources = IMAGERY_SOURCES.filter(s => s.category === cat);
              return (
                <div key={cat}>
                  {/* 分类标题 */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px 6px',
                    borderTop: catIdx > 0 ? `1px solid ${COLORS.border}` : 'none',
                    marginTop: catIdx > 0 ? 4 : 0,
                  }}>
                    <div style={{ width: 2, height: 12, background: COLORS.border, flexShrink: 0 }} />
                    <span style={{
                      color: COLORS.textDim, fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
                    }}>
                      {IMAGERY_CATEGORIES[cat]}
                    </span>
                  </div>

                  {sources.map(source => {
                    const isActive = activeId === source.id;
                    const isLoading = loading === source.id;
                    return (
                      <div
                        key={source.id}
                        onClick={() => handleSelect(source)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 14px',
                          cursor: loading ? 'wait' : 'pointer',
                          background: isActive ? 'rgba(74,158,255,0.1)' : 'transparent',
                          borderLeft: `3px solid ${isActive ? COLORS.accent : 'transparent'}`,
                          transition: 'background 0.15s',
                          opacity: loading && !isLoading ? 0.45 : 1,
                        }}
                        onMouseEnter={e => {
                          if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
                        }}
                        onMouseLeave={e => {
                          if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                        }}
                      >
                        <PreviewImage src={source.previewUrl} alt={source.name} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                            <span style={{
                              color: isActive ? COLORS.accent : COLORS.primary,
                              fontWeight: isActive ? 700 : 400,
                              fontSize: 13,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {source.name}
                            </span>
                            {isLoading && (
                              <span style={{ color: COLORS.warning, fontSize: 11, flexShrink: 0 }}>加载中</span>
                            )}
                            {isActive && !isLoading && (
                              <span style={{ color: COLORS.success, fontSize: 12, flexShrink: 0 }}>✓</span>
                            )}
                          </div>
                          <div style={{ color: COLORS.textDim, fontSize: 11, lineHeight: 1.4 }}>
                            {source.description}
                            {source.temporal && (
                              <span style={{ color: COLORS.warning, marginLeft: 5 }}>● 实时</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
