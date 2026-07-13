'use client';

import React, { useState } from 'react';
import { useModStore } from '@/lib/mod-manager/store';
import { MOD_ICONS } from '@/lib/mods/icons';

export interface ModDetailPanelProps {
  modId: string;
  onSave?: (config: Record<string, unknown>) => void;
  onClose?: () => void;
  lang?: 'zh' | 'en';
  className?: string;
}

function getT(lang: 'zh' | 'en') {
  return {
    introduction: lang === 'zh' ? '简介' : 'Introduction',
    config: lang === 'zh' ? '配置' : 'Config',
    noConfig: lang === 'zh' ? '此MOD没有可配置选项' : 'This MOD has no configuration options',
    save: lang === 'zh' ? '保存' : 'Save',
    reset: lang === 'zh' ? '重置' : 'Reset',
    notFound: lang === 'zh' ? 'MOD未找到' : 'MOD not found',
    noPreview: lang === 'zh' ? '暂无预览图' : 'No preview images',
  };
}

export const ModDetailPanel: React.FC<ModDetailPanelProps> = ({
  modId,
  onSave,
  onClose,
  lang = 'zh',
  className = '',
}) => {
  const t = getT(lang);
  const mods = useModStore((state) => state.mods);
  const setModConfig = useModStore((state) => state.setModConfig);

  const entry = mods[modId];
  const manifest = entry?.manifest;

  const [activeTab, setActiveTab] = useState<'intro' | 'config'>('intro');
  const [config, setConfig] = useState<Record<string, unknown>>(entry?.config || {});
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [iconError, setIconError] = useState(false);

  if (!manifest) {
    return (
      <div className={`mod-detail-panel ${className} p-6`}>
        <div className="text-center text-gray-500 py-8">{t.notFound}</div>
      </div>
    );
  }

  const handleSave = () => {
    setModConfig(modId, config);
    onSave?.(config);
    setHasChanges(false);
  };

  const handleReset = () => {
    setConfig(entry?.config || {});
    setHasChanges(false);
  };

  const displayName = lang === 'zh' ? (manifest.nameZh || manifest.name) : manifest.name;
  const displayDesc = lang === 'zh' ? (manifest.descriptionZh || manifest.description) : manifest.description;

  // Collect only screenshots (icon shown separately in header)
  const images: string[] = [];
  if (manifest.screenshots) {
    manifest.screenshots.forEach(s => { if (s) images.push(s); });
  }

  const SvgIcon = MOD_ICONS[modId];

  return (
    <div className={`mod-detail-panel ${className} p-0 flex flex-col h-full overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            {manifest.iconImage && !iconError ? (
              <img src={manifest.iconImage} alt="" className="w-8 h-8 rounded-lg object-cover" onError={() => setIconError(true)} />
            ) : SvgIcon ? (
              <div className="text-white/80">{SvgIcon}</div>
            ) : manifest.icon ? (
              <span className="text-lg">{manifest.icon}</span>
            ) : (
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white truncate">{displayName}</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-gray-400 hover:text-white text-sm flex-shrink-0"
            aria-label="Close"
          >✕</button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/10 bg-white/5">
        <button
          onClick={() => setActiveTab('intro')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'intro'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >{t.introduction}</button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'config'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >{t.config}</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'intro' ? (
          <div className="p-5 space-y-5">
            {/* Image gallery */}
            {images.length > 0 && (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-black/30 aspect-video flex items-center justify-center">
                  <img
                    src={images[selectedImageIndex]}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImageIndex(i)}
                        className={`w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                          selectedImageIndex === i ? 'border-blue-500' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {images.length === 0 && (
              <div className="text-center text-gray-500 py-8 text-sm">{t.noPreview}</div>
            )}

            {/* Description */}
            {displayDesc && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  {lang === 'zh' ? '描述' : 'Description'}
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{displayDesc}</p>
              </div>
            )}

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-gray-500 block">{lang === 'zh' ? '版本' : 'Version'}</span>
                <span className="text-white">v{manifest.version}</span>
              </div>
              {manifest.author && (
                <div>
                  <span className="text-xs text-gray-500 block">{lang === 'zh' ? '作者' : 'Author'}</span>
                  <span className="text-white">{manifest.author}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500 block">ID</span>
                <span className="text-gray-400 text-xs font-mono">{manifest.id}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">{lang === 'zh' ? '协议' : 'License'}</span>
                <span className="text-white">{manifest.license || 'MIT'}</span>
              </div>
            </div>

            {/* Dependency info */}
            {manifest.dependencies && manifest.dependencies.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  {lang === 'zh' ? '依赖' : 'Dependencies'}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {manifest.dependencies.map(dep => {
                    const depState = mods[dep.id]?.state;
                    const depEnabled = depState === 'enabled';
                    return (
                      <span key={dep.id}
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          depEnabled ? 'border-green-500/50 text-green-400 bg-green-500/10'
                            : 'border-red-500/50 text-red-400 bg-red-500/10'
                        }`}
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
              </div>
            )}
          </div>
        ) : (
          /* Config Tab */
          <div className="p-5">
            {manifest.hasConfig ? (
              <div className="text-gray-400">
                <p className="text-sm">{t.noConfig}</p>
                <p className="text-xs text-gray-500 mt-2">MOD ID: {modId}</p>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">{t.noConfig}</div>
            )}
          </div>
        )}
      </div>

      {/* Bottom: save/reset (only in config tab with changes) */}
      {activeTab === 'config' && hasChanges && (
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/10">
          <button onClick={handleReset}
            className="px-4 py-2 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all text-sm"
          >{t.reset}</button>
          <button onClick={handleSave}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md text-sm"
          >{t.save}</button>
        </div>
      )}
    </div>
  );
};

export default ModDetailPanel;
