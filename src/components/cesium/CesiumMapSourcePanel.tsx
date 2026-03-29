'use client';

import { useState, useCallback, useRef } from 'react';
import { IMAGERY_SOURCES, IMAGERY_CATEGORIES, ImageryCategory, ImagerySourceDef } from '@/lib/cesium/imageryProviders';

interface CesiumMapSourcePanelProps {
  earthPlanet?: any;
  visible?: boolean;
}

function PreviewImage({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  return (
    <div style={{
      width: '72px', height: '48px', flexShrink: 0,
      borderRadius: '3px', overflow: 'hidden',
      backgroundColor: '#111',
      border: '1px solid rgba(255,255,255,0.1)',
      position: 'relative',
    }}>
      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#444', fontSize: '10px',
        }}>…</div>
      )}
      {status === 'error' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#f87171', fontSize: '9px', textAlign: 'center', padding: '2px',
        }}>预览<br/>不可用</div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setStatus('ok')}
        onError={() => setStatus('error')}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          display: status === 'ok' ? 'block' : 'none',
        }}
      />
    </div>
  );
}

export default function CesiumMapSourcePanel({ earthPlanet, visible = true }: CesiumMapSourcePanelProps) {
  const [activeId, setActiveId] = useState<string>('bing-default');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((msg: string) => {
    setError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 4000);
  }, []);

  const applySource = useCallback(async (source: ImagerySourceDef, silent = false) => {
    const ext = earthPlanet?.getCesiumExtension?.();
    if (!ext) return;
    if (!silent) setLoading(source.id);
    setError(null);
    try {
      const provider = await source.create();
      if (provider !== null) {
        ext.setImageryProvider(provider);
      }
      setActiveId(source.id);
    } catch (e: any) {
      if (!silent) showError(`加载失败：${source.name}（${e?.message ?? '网络错误'}）`);
    } finally {
      if (!silent) setLoading(null);
    }
  }, [earthPlanet, showError]);

  const handleSelect = useCallback(async (source: ImagerySourceDef) => {
    if (!earthPlanet || loading) return;
    await applySource(source);
  }, [earthPlanet, loading, applySource]);

  if (!visible) return null;

  const categories = Object.keys(IMAGERY_CATEGORIES) as ImageryCategory[];

  return (
    <div style={{
      position: 'fixed',
      right: '10px',
      bottom: '80px',
      width: isCollapsed ? '130px' : '280px',
      backgroundColor: 'rgba(0,0,0,0.88)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '4px',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '11px',
      zIndex: 1000,
      transition: 'width 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 标题栏 */}
      <div
        onClick={() => setIsCollapsed(v => !v)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 10px',
          borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ color: '#4a9eff', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase' }}>
          🗺️ 地图源
        </span>
        <span style={{ color: '#999', fontSize: '12px' }}>{isCollapsed ? '▲' : '▼'}</span>
      </div>

      {/* 错误提示 */}
      {!isCollapsed && error && (
        <div style={{
          margin: '6px 8px 0',
          padding: '6px 8px',
          backgroundColor: 'rgba(248,113,113,0.15)',
          border: '1px solid rgba(248,113,113,0.4)',
          borderRadius: '3px',
          color: '#f87171',
          fontSize: '10px',
          lineHeight: '1.4',
        }}>
          ⚠️ {error}
        </div>
      )}

      {!isCollapsed && (
        <div style={{ overflowY: 'auto', maxHeight: '420px', paddingBottom: '6px' }}>
          {categories.map(cat => {
            const sources = IMAGERY_SOURCES.filter(s => s.category === cat);
            return (
              <div key={cat}>
                <div style={{
                  padding: '8px 10px 4px',
                  color: '#888',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderTop: cat !== categories[0] ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  marginTop: cat !== categories[0] ? '4px' : '0',
                }}>
                  {IMAGERY_CATEGORIES[cat]}
                </div>

                {sources.map(source => {
                  const isActive = activeId === source.id;
                  const isLoading = loading === source.id;
                  return (
                    <div
                      key={source.id}
                      onClick={() => handleSelect(source)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '7px 10px',
                        cursor: loading ? 'wait' : 'pointer',
                        backgroundColor: isActive ? 'rgba(74,158,255,0.12)' : 'transparent',
                        borderLeft: isActive ? '2px solid #4a9eff' : '2px solid transparent',
                        transition: 'background 0.15s',
                        opacity: loading && !isLoading ? 0.5 : 1,
                      }}
                      onMouseEnter={e => {
                        if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
                      }}
                      onMouseLeave={e => {
                        if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <PreviewImage src={source.previewUrl} alt={source.name} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          marginBottom: '2px',
                        }}>
                          <span style={{
                            color: isActive ? '#4a9eff' : '#fff',
                            fontWeight: isActive ? 'bold' : 'normal',
                            fontSize: '11px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {source.name}
                          </span>
                          {isLoading && <span style={{ color: '#fbbf24', fontSize: '9px', flexShrink: 0 }}>加载…</span>}
                          {isActive && !isLoading && <span style={{ color: '#4ade80', fontSize: '10px', flexShrink: 0 }}>✓</span>}
                        </div>
                        <div style={{ color: '#666', fontSize: '9px', lineHeight: '1.3' }}>
                          {source.description}
                          {source.temporal && (
                            <span style={{ color: '#f59e0b', marginLeft: '4px' }}>● 实时</span>
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
      )}
    </div>
  );
}
