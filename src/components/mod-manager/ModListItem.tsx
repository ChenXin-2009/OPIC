'use client';

/**
 * MOD列表项组件
 * 
 * 显示单个MOD的信息和状态。
 */

import React from 'react';
import type { ModManifest, ModState } from '@/lib/mod-manager/types';

export interface ModListItemProps {
  /** MOD ID */
  modId: string;
  /** MOD清单 */
  manifest: ModManifest;
  /** MOD状态 */
  state: ModState;
  /** 错误计数 */
  errorCount?: number;
  /** 点击回调 */
  onClick?: () => void;
  /** 启用/禁用切换回调 */
  onToggle?: (enabled: boolean) => void;
  /** 语言 */
  lang?: 'zh' | 'en';
  /** 类名 */
  className?: string;
}

/**
 * 状态标签颜色映射
 */
const STATE_COLORS: Record<ModState, string> = {
  registered: 'bg-gray-500',
  loaded: 'bg-blue-500',
  enabled: 'bg-green-500',
  disabled: 'bg-yellow-500',
  unloaded: 'bg-gray-400',
};

/**
 * 状态标签文本映射
 */
function getStateLabel(state: ModState, lang: 'zh' | 'en'): string {
  if (lang === 'en') {
    const EN: Record<ModState, string> = {
      registered: 'Registered',
      loaded: 'Loaded',
      enabled: 'Enabled',
      disabled: 'Disabled',
      unloaded: 'Unloaded',
    };
    return EN[state];
  }
  const ZH: Record<ModState, string> = {
    registered: '已注册',
    loaded: '已加载',
    enabled: '已启用',
    disabled: '已禁用',
    unloaded: '已卸载',
  };
  return ZH[state];
}

/**
 * MOD列表项组件
 */
export const ModListItem: React.FC<ModListItemProps> = ({
  modId,
  manifest,
  state,
  errorCount = 0,
  onClick,
  onToggle,
  lang = 'zh',
  className = '',
}) => {
  const isEnabled = state === 'enabled';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.(!isEnabled);
  };

  const displayName = lang === 'zh' ? (manifest.nameZh || manifest.name) : manifest.name;
  const displayDesc = lang === 'zh' ? (manifest.descriptionZh || manifest.description) : manifest.description;
  const toggleLabel = isEnabled
    ? (lang === 'zh' ? '禁用' : 'Disable')
    : (lang === 'zh' ? '启用' : 'Enable');
  const errorLabel = lang === 'zh' ? `${errorCount} 个错误` : `${errorCount} error${errorCount !== 1 ? 's' : ''}`;

  return (
    <div
      className={`mod-list-item ${className} p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors`}
      onClick={onClick}
    >
      {/* 头部：名称和状态 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* 图标 */}
          {manifest.icon && (
            <img
              src={manifest.icon}
              alt={manifest.name}
              className="w-6 h-6"
            />
          )}
          {/* 名称 */}
          <h3 className="font-medium text-gray-900">{displayName}</h3>
        </div>
        {/* 状态标签 */}
        <span
          className={`px-2 py-1 text-xs text-white rounded ${STATE_COLORS[state]}`}
        >
          {getStateLabel(state, lang)}
        </span>
      </div>

      {/* 描述 */}
      {displayDesc && (
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {displayDesc}
        </p>
      )}

      {/* 底部：版本、作者、错误 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>v{manifest.version}</span>
          {manifest.author && <span>· {manifest.author}</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* 错误指示 */}
          {errorCount > 0 && (
            <span className="text-red-500">
              {errorLabel}
            </span>
          )}
          {/* 启用/禁用开关 */}
          <button
            onClick={handleToggle}
            className={`px-3 py-1 rounded text-white transition-colors ${
              isEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {toggleLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModListItem;