'use client';

/**
 * MOD配置面板组件
 * 
 * 显示和编辑MOD的配置选项。
 */

import React, { useState, useEffect } from 'react';
import { useModStore } from '@/lib/mod-manager/store';
import type { ModManifest } from '@/lib/mod-manager/types';

export interface ModConfigPanelProps {
  /** MOD ID */
  modId: string;
  /** 保存回调 */
  onSave?: (config: Record<string, unknown>) => void;
  /** 关闭回调 */
  onClose?: () => void;
  /** 语言 */
  lang?: 'zh' | 'en';
  /** 类名 */
  className?: string;
}

/**
 * 获取翻译
 */
function getT(lang: 'zh' | 'en') {
  return {
    config: lang === 'zh' ? '配置' : 'Config',
    noConfig: lang === 'zh' ? '此MOD没有可配置选项' : 'This MOD has no configuration options',
    save: lang === 'zh' ? '保存' : 'Save',
    reset: lang === 'zh' ? '重置' : 'Reset',
    notFound: lang === 'zh' ? 'MOD未找到' : 'MOD not found',
    modId: lang === 'zh' ? 'MOD ID' : 'MOD ID',
  };
}

/**
 * MOD配置面板组件
 */
export const ModConfigPanel: React.FC<ModConfigPanelProps> = ({
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

  const [config, setConfig] = useState<Record<string, unknown>>(
    entry?.config || {}
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (entry?.config) {
      setConfig(entry.config);
      setHasChanges(false);
    }
  }, [entry?.config]);

  if (!manifest) {
    return (
      <div className={`mod-config-panel ${className} p-6`}>
        <div className="text-center text-gray-500 py-8">{t.notFound}</div>
      </div>
    );
  }

  const handleConfigChange = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setModConfig(modId, config);
    onSave?.(config);
    setHasChanges(false);
  };

  const handleReset = () => {
    setConfig(entry?.config || {});
    setHasChanges(false);
  };

  return (
    <div className={`mod-config-panel ${className} p-6 flex flex-col h-full`}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{manifest.name} {t.config}</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        )}
      </div>

      {/* 配置内容 */}
      <div className="flex-1 overflow-auto">
        {manifest.hasConfig ? (
          <div className="text-gray-400">
            <p className="text-sm">{t.noConfig}</p>
            <p className="text-xs text-gray-500 mt-2">
              {t.modId}: {modId}
            </p>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">
            {t.noConfig}
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      {hasChanges && (
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#333]">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors"
          >
            {t.reset}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            {t.save}
          </button>
        </div>
      )}
    </div>
  );
};

export default ModConfigPanel;