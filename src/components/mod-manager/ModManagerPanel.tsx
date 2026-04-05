'use client';

/**
 * MOD管理器面板
 * 
 * 提供MOD管理的完整UI界面。
 */

import React, { useState } from 'react';
import { useModManager } from '@/hooks/useModManager';
import { ModList } from './ModList';
import { ModConfigPanel } from './ModConfigPanel';
import { ModPerformancePanel } from './ModPerformancePanel';

interface ModManagerPanelProps {
  /** 关闭回调 */
  onClose?: () => void;
  /** 语言 */
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
    close: lang === 'zh' ? '关闭' : 'Close',
    loading: lang === 'zh' ? '加载中...' : 'Loading...',
    noMods: lang === 'zh' ? '暂无已安装的MOD' : 'No installed MODs',
    installed: lang === 'zh' ? '已安装' : 'Installed',
    enabled: lang === 'zh' ? '已启用' : 'Enabled',
    disabled: lang === 'zh' ? '已禁用' : 'Disabled',
    enable: lang === 'zh' ? '启用' : 'Enable',
    disable: lang === 'zh' ? '禁用' : 'Disable',
    search: lang === 'zh' ? '搜索MOD...' : 'Search MODs...',
    all: lang === 'zh' ? '全部' : 'All',
    performance: lang === 'zh' ? '性能监控' : 'Performance Monitor',
    noPerfData: lang === 'zh' ? '暂无MOD性能数据' : 'No performance data',
    init: lang === 'zh' ? '初始化' : 'Init',
    render: lang === 'zh' ? '渲染' : 'Render',
    warnings: lang === 'zh' ? '个警告' : 'warnings',
    times: lang === 'zh' ? '次' : 'times',
    config: lang === 'zh' ? '配置' : 'Config',
    noConfig: lang === 'zh' ? '此MOD没有可配置选项' : 'This MOD has no configuration options',
    save: lang === 'zh' ? '保存' : 'Save',
    reset: lang === 'zh' ? '重置' : 'Reset',
  };
}

/**
 * MOD管理器面板组件
 */
export const ModManagerPanel: React.FC<ModManagerPanelProps> = ({
  onClose,
  lang = 'zh',
}) => {
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
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0a] border-2 border-[#333] rounded-lg w-[95vw] max-w-6xl h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
        }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
          <h2 className="text-xl font-bold text-white">{t.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-[#333]">
          <button
            onClick={() => setActiveTab('mods')}
            className={`px-8 py-3 text-sm font-medium transition-colors ${
              activeTab === 'mods'
                ? 'text-white border-b-2 border-white bg-[#111]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.modsTab}
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-8 py-3 text-sm font-medium transition-colors ${
              activeTab === 'performance'
                ? 'text-white border-b-2 border-white bg-[#111]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.performanceTab}
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">{t.loading}</div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">{error}</div>
          ) : activeTab === 'mods' ? (
            <div className="flex gap-6 h-full">
              {/* 左侧：MOD列表 */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* 过滤器 */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setFilterState('all')}
                    className={`px-4 py-2 rounded text-sm transition-colors ${
                      filterState === 'all'
                        ? 'bg-white text-black'
                        : 'bg-[#222] text-gray-300 hover:bg-[#333]'
                    }`}
                  >
                    {t.all}
                  </button>
                  <button
                    onClick={() => setFilterState('enabled')}
                    className={`px-4 py-2 rounded text-sm transition-colors ${
                      filterState === 'enabled'
                        ? 'bg-green-600 text-white'
                        : 'bg-[#222] text-gray-300 hover:bg-[#333]'
                    }`}
                  >
                    {t.enabled}
                  </button>
                  <button
                    onClick={() => setFilterState('disabled')}
                    className={`px-4 py-2 rounded text-sm transition-colors ${
                      filterState === 'disabled'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-[#222] text-gray-300 hover:bg-[#333]'
                    }`}
                  >
                    {t.disabled}
                  </button>
                </div>

                {/* MOD列表 */}
                <div className="flex-1 overflow-auto space-y-3">
                  {filteredModIds.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">{t.noMods}</div>
                  ) : (
                    filteredModIds.map((modId) => {
                      const entry = mods[modId];
                      const isEnabled = entry.state === 'enabled';
                      return (
                        <div
                          key={modId}
                          onClick={() => setSelectedModId(modId)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedModId === modId
                              ? 'border-white bg-[#1a1a1a]'
                              : 'border-[#333] hover:border-[#555] bg-[#111]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-medium text-white text-lg">
                                {lang === 'zh' ? (entry.manifest.nameZh || entry.manifest.name) : entry.manifest.name}
                              </h3>
                              <span className={`px-2 py-1 text-xs rounded ${
                                isEnabled ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
                              }`}>
                                {isEnabled ? t.enabled : t.disabled}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleMod(modId);
                              }}
                              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                                isEnabled
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {isEnabled ? t.disable : t.enable}
                            </button>
                          </div>
                          {(lang === 'zh' ? (entry.manifest.descriptionZh || entry.manifest.description) : entry.manifest.description) && (
                            <p className="text-sm text-gray-400 mb-2">
                              {lang === 'zh' ? (entry.manifest.descriptionZh || entry.manifest.description) : entry.manifest.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>v{entry.manifest.version}</span>
                            {entry.manifest.author && <span>· {entry.manifest.author}</span>}
                            {entry.errorCount > 0 && (
                              <span className="text-red-400">{entry.errorCount} errors</span>
                            )}
                          </div>
                          {/* 依赖项 */}
                          {entry.manifest.dependencies && entry.manifest.dependencies.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              <span className="text-xs text-gray-600">
                                {lang === 'zh' ? '依赖：' : 'Requires: '}
                              </span>
                              {entry.manifest.dependencies.map(dep => {
                                const depState = mods[dep.id]?.state;
                                const depEnabled = depState === 'enabled';
                                return (
                                  <span
                                    key={dep.id}
                                    className={`text-xs px-1.5 py-0.5 rounded border ${
                                      depEnabled
                                        ? 'border-green-700 text-green-400'
                                        : 'border-red-700 text-red-400'
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
                    className="bg-[#111] rounded-lg h-full"
                  />
                </div>
              )}
            </div>
          ) : (
            <ModPerformancePanel lang={lang} className="bg-[#111] rounded-lg" />
          )}
        </div>
      </div>
    </div>
  );
};

export default ModManagerPanel;