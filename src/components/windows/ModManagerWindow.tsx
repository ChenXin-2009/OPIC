/**
 * ModManagerWindow.tsx - macOS 风格 MOD 管理器窗口
 * 
 * 将 ModManagerPanel 组件封装到窗口中
 */

'use client';

import { useState } from 'react';
import { useModManager } from '@/hooks/useModManager';
import { ModConfigPanel } from '../mod-manager/ModConfigPanel';
import { ModPerformancePanel } from '../mod-manager/ModPerformancePanel';

interface ModManagerWindowProps {
  lang?: 'zh' | 'en';
}

/**
 * 获取翻译文本
 */
function getTranslations(lang: 'zh' | 'en') {
  return {
    title: lang === 'zh' ? 'MOD 管理器' : 'MOD Manager',
    modsTab: lang === 'zh' ? 'MOD列表' : 'MODs',
    performanceTab: lang === 'zh' ? '性能监控' : 'Performance',
    loading: lang === 'zh' ? '加载中...' : 'Loading...',
    noMods: lang === 'zh' ? '暂无已安装的MOD' : 'No installed MODs',
    enabled: lang === 'zh' ? '已启用' : 'Enabled',
    disabled: lang === 'zh' ? '已禁用' : 'Disabled',
    enable: lang === 'zh' ? '启用' : 'Enable',
    disable: lang === 'zh' ? '禁用' : 'Disable',
    all: lang === 'zh' ? '全部' : 'All',
  };
}

export function ModManagerWindow({ lang = 'zh' }: ModManagerWindowProps) {
  const [selectedModId, setSelectedModId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mods' | 'performance'>('mods');
  const [filterState, setFilterState] = useState<'all' | 'enabled' | 'disabled'>('all');

  const t = getTranslations(lang);

  const {
    mods,
    isLoading,
    error,
    enableMod,
    disableMod,
    getModState,
  } = useModManager();

  const handleToggleMod = async (modId: string) => {
    const currentState = getModState(modId);
    try {
      if (currentState === 'enabled') {
        await disableMod(modId);
      } else {
        await enableMod(modId);
      }
    } catch (err) {
      console.error('切换MOD状态失败:', err);
    }
  };

  // 过滤MOD列表
  const filteredModIds = Object.keys(mods).filter(modId => {
    const state = mods[modId].state;
    if (filterState === 'enabled') return state === 'enabled';
    if (filterState === 'disabled') return state !== 'enabled';
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-white/5">
      {/* 标签页 */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('mods')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'mods'
              ? 'text-white border-b-2 border-blue-500 bg-white/5'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          {t.modsTab}
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'performance'
              ? 'text-white border-b-2 border-blue-500 bg-white/5'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          {t.performanceTab}
        </button>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="text-center text-white/60 py-8">{t.loading}</div>
        ) : error ? (
          <div className="text-center text-red-400 py-8">{error}</div>
        ) : activeTab === 'mods' ? (
          <div className="flex gap-4 h-full">
            {/* 左侧：MOD列表 */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* 过滤器 */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setFilterState('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterState === 'all'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {t.all}
                </button>
                <button
                  onClick={() => setFilterState('enabled')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterState === 'enabled'
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {t.enabled}
                </button>
                <button
                  onClick={() => setFilterState('disabled')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterState === 'disabled'
                      ? 'bg-yellow-500 text-white shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {t.disabled}
                </button>
              </div>

              {/* MOD列表 */}
              <div className="flex-1 overflow-auto space-y-3">
                {filteredModIds.length === 0 ? (
                  <div className="text-center text-white/50 py-8">{t.noMods}</div>
                ) : (
                  filteredModIds.map((modId) => {
                    const entry = mods[modId];
                    const isEnabled = entry.state === 'enabled';
                    return (
                      <div
                        key={modId}
                        onClick={() => setSelectedModId(modId)}
                        className={`p-4 rounded-xl cursor-pointer transition-all ${
                          selectedModId === modId
                            ? 'bg-white/20 shadow-lg ring-2 ring-blue-500'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-white text-base">
                              {lang === 'zh' ? (entry.manifest.nameZh || entry.manifest.name) : entry.manifest.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              isEnabled ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {isEnabled ? t.enabled : t.disabled}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleMod(modId);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              isEnabled
                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-md'
                                : 'bg-green-500 hover:bg-green-600 text-white shadow-md'
                            }`}
                          >
                            {isEnabled ? t.disable : t.enable}
                          </button>
                        </div>
                        {(lang === 'zh' ? (entry.manifest.descriptionZh || entry.manifest.description) : entry.manifest.description) && (
                          <p className="text-sm text-white/60 mb-2">
                            {lang === 'zh' ? (entry.manifest.descriptionZh || entry.manifest.description) : entry.manifest.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-white/40">
                          <span>v{entry.manifest.version}</span>
                          {entry.manifest.author && <span>· {entry.manifest.author}</span>}
                          {entry.errorCount > 0 && (
                            <span className="text-red-400">{entry.errorCount} errors</span>
                          )}
                        </div>
                        {/* 依赖项 */}
                        {entry.manifest.dependencies && entry.manifest.dependencies.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="text-xs text-white/40">
                              {lang === 'zh' ? '依赖：' : 'Requires: '}
                            </span>
                            {entry.manifest.dependencies.map(dep => {
                              const depState = mods[dep.id]?.state;
                              const depEnabled = depState === 'enabled';
                              return (
                                <span
                                  key={dep.id}
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    depEnabled
                                      ? 'bg-green-500/20 text-green-400'
                                      : 'bg-red-500/20 text-red-400'
                                  }`}
                                  title={depEnabled
                                    ? (lang === 'zh' ? '依赖已启用' : 'Dependency enabled')
                                    : (lang === 'zh' ? '依赖未启用' : 'Dependency not enabled')}
                                >
                                  {depEnabled ? '✓' : '✗'} {mods[dep.id]?.manifest
                                    ? (lang === 'zh'
                                        ? (mods[dep.id].manifest.nameZh || mods[dep.id].manifest.name)
                                        : mods[dep.id].manifest.name)
                                    : dep.id}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 右侧：配置面板 */}
            {selectedModId && (
              <div className="w-80 flex-shrink-0">
                <ModConfigPanel
                  modId={selectedModId}
                  onClose={() => setSelectedModId(null)}
                  lang={lang}
                  className="bg-white/5 rounded-xl h-full"
                />
              </div>
            )}
          </div>
        ) : (
          <ModPerformancePanel lang={lang} className="bg-white/5 rounded-xl" />
        )}
      </div>
    </div>
  );
}
