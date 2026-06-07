/**
 * CesiumControlWindow.tsx - macOS 风格 Cesium 地球控制窗口
 * 
 * 集成 Cesium 切换和地图源选择
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useEarthControlStore } from '@/lib/state/earthControlStore';
import { IMAGERY_CATEGORIES, IMAGERY_SOURCES, ImageryCategory, ImagerySourceDef, getCategoryName } from '@/lib/cesium/imageryProviders';

interface CesiumControlWindowProps {
  lang?: 'zh' | 'en';
}

function PreviewImage({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  return (
    <div className="w-16 h-11 flex-shrink-0 rounded overflow-hidden bg-white/5 border border-white/10 relative">
      {status !== 'ok' && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
          {status === 'error' ? '✕' : '…'}
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setStatus('ok')}
        onError={() => setStatus('error')}
        className={`w-full h-full object-cover ${status === 'ok' ? 'block' : 'hidden'}`}
      />
    </div>
  );
}

export function CesiumControlWindow({
  lang = 'zh',
}: CesiumControlWindowProps) {
  const [activeId, setActiveId] = useState<string>('esri-world-imagery');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 从全局状态获取
  const { cesiumEnabled, earthPlanet, setCesiumEnabled } = useEarthControlStore();

  const content = {
    zh: {
      title: 'Cesium 地球',
      enable: '启用 Cesium',
      enableDesc: '启用高精度 3D 地球渲染',
      mapSource: '地图源',
      mapSourceDesc: '选择地图数据源',
      loading: '加载中',
      loadError: '加载失败',
    },
    en: {
      title: 'Cesium Earth',
      enable: 'Enable Cesium',
      enableDesc: 'Enable high-precision 3D Earth rendering',
      mapSource: 'Map Source',
      mapSourceDesc: 'Select map data source',
      loading: 'Loading',
      loadError: 'Load failed',
    },
  };

  const t = content[lang];

  const showError = useCallback((msg: string) => {
    setError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 4000);
  }, []);

  const applySource = useCallback(async (source: ImagerySourceDef) => {
    const ext = earthPlanet?.getCesiumExtension?.();
    if (!ext) return;
    setLoading(source.id);
    setError(null);
    try {
      const provider = await source.create();
      if (provider !== null) ext.setImageryProvider(provider);
      setActiveId(source.id);
    } catch (e: any) {
      showError(`${t.loadError}: ${source.name[lang]}（${e?.message ?? 'Network error'}）`);
    } finally {
      setLoading(null);
    }
  }, [earthPlanet, showError, t.loadError, lang]);

  const handleSelect = useCallback(async (source: ImagerySourceDef) => {
    if (!earthPlanet || loading) return;
    await applySource(source);
  }, [earthPlanet, loading, applySource]);

  const categories = Object.keys(IMAGERY_CATEGORIES) as ImageryCategory[];

  return (
    <div className="h-full flex flex-col bg-white/5">
      {/* Cesium 启用控制 */}
      <div className="p-4 border-b border-white/10">
        <div className="p-4 bg-white/5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🌍</div>
              <div>
                <h3 className="text-lg font-semibold text-white">{t.enable}</h3>
                <p className="text-sm text-white/60">{t.enableDesc}</p>
              </div>
            </div>
            <button
              onClick={() => setCesiumEnabled(!cesiumEnabled)}
              className={`relative w-14 h-8 rounded-full transition-all ${
                cesiumEnabled ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${
                  cesiumEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 地图源选择 */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-white mb-2">{t.mapSource}</h3>
          <p className="text-sm text-white/60 mb-4">{t.mapSourceDesc}</p>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              ⚠ {error}
            </div>
          )}

          {/* 地图源列表 */}
          <div className="space-y-4">
            {categories.map((cat) => {
              const sources = IMAGERY_SOURCES.filter(s => s.category === cat);
              return (
                <div key={cat}>
                  {/* 分类标题 */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-0.5 h-3 bg-white/20" />
                    <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                      {getCategoryName(cat, lang)}
                    </span>
                  </div>

                  {/* 源列表 */}
                  <div className="space-y-2">
                    {sources.map(source => {
                      const isActive = activeId === source.id;
                      const isLoading = loading === source.id;
                      return (
                        <div
                          key={source.id}
                          onClick={() => handleSelect(source)}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            isActive
                              ? 'bg-blue-500/20 border-l-4 border-blue-500'
                              : 'bg-white/5 hover:bg-white/10 border-l-4 border-transparent'
                          } ${loading && !isLoading ? 'opacity-50' : ''}`}
                        >
                          <PreviewImage src={source.previewUrl} alt={source.name[lang]} />

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-sm font-medium truncate ${
                                isActive ? 'text-blue-400' : 'text-white'
                              }`}>
                                {source.name[lang]}
                              </span>
                              {isLoading && (
                                <span className="text-xs text-yellow-400 flex-shrink-0">{t.loading}</span>
                              )}
                              {isActive && !isLoading && (
                                <span className="text-green-400 flex-shrink-0">✓</span>
                              )}
                            </div>
                            <div className="text-xs text-white/60 leading-tight">
                              {source.description[lang]}
                              {source.temporal && (
                                <span className="text-yellow-400 ml-2">● {lang === 'zh' ? '实时' : 'Live'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
