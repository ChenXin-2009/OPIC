/**
 * ModConfigPanel.tsx - MOD 配置面板组件
 * 
 * 提供 macOS 风格的 MOD 配置界面
 */

'use client';

import { useState, useCallback } from 'react';
import { ConfigUIGenerator } from '@/lib/mod-manager/config/ConfigUIGenerator';
import type { JSONSchema } from '@/lib/mod-manager/config/types';

/**
 * MOD 配置面板属性
 */
export interface ModConfigPanelProps {
  /** MOD ID */
  modId: string;
  /** MOD 名称 */
  modName: string;
  /** 配置 Schema */
  schema: JSONSchema;
  /** 当前配置值 */
  config: Record<string, unknown>;
  /** 保存配置回调 */
  onSave: (config: Record<string, unknown>) => Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
  /** 语言 */
  lang?: 'zh' | 'en';
}

/**
 * MOD 配置面板组件
 */
export function ModConfigPanel({
  modId,
  modName,
  schema,
  config,
  onSave,
  onCancel,
  lang = 'zh',
}: ModConfigPanelProps) {
  const [currentConfig, setCurrentConfig] = useState(config);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 处理保存
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await onSave(currentConfig);
      setSuccess(true);
      
      // 3秒后清除成功提示
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [currentConfig, onSave]);

  // 处理重置
  const handleReset = useCallback(() => {
    setCurrentConfig(config);
    setError(null);
    setSuccess(false);
  }, [config]);

  // 检查是否有修改
  const hasChanges = JSON.stringify(currentConfig) !== JSON.stringify(config);

  return (
    <div className="h-full flex flex-col bg-white/5">
      {/* 头部 */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">
          {modName} {lang === 'zh' ? '配置' : 'Configuration'}
        </h2>
        <p className="text-sm text-white/60 mt-1">
          {lang === 'zh' ? 'MOD ID' : 'MOD ID'}: {modId}
        </p>
      </div>

      {/* 配置表单 */}
      <div className="flex-1 overflow-auto p-4">
        <ConfigUIGenerator
          schema={schema}
          value={currentConfig}
          onChange={setCurrentConfig}
          lang={lang}
        />
      </div>

      {/* 底部操作栏 */}
      <div className="p-4 border-t border-white/10">
        {/* 状态提示 */}
        {error && (
          <div className="mb-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {lang === 'zh' ? '保存失败' : 'Save failed'}: {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
            {lang === 'zh' ? '✓ 配置已保存' : '✓ Configuration saved'}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {lang === 'zh' ? '重置' : 'Reset'}
            </button>
          </div>

          <div className="flex gap-2">
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={saving}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? (lang === 'zh' ? '保存中...' : 'Saving...')
                : (lang === 'zh' ? '保存' : 'Save')}
            </button>
          </div>
        </div>

        {/* 修改提示 */}
        {hasChanges && !saving && (
          <p className="text-xs text-white/40 mt-2 text-center">
            {lang === 'zh' ? '有未保存的修改' : 'You have unsaved changes'}
          </p>
        )}
      </div>
    </div>
  );
}
