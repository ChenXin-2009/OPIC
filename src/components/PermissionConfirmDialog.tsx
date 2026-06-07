/**
 * PermissionConfirmDialog.tsx - 权限确认对话框
 * 
 * 在 MOD 安装时显示权限确认对话框
 */

'use client';

import { useState } from 'react';
import { PermissionViewer } from './PermissionViewer';

/**
 * 权限确认对话框属性
 */
export interface PermissionConfirmDialogProps {
  /** MOD 名称 */
  modName: string;
  /** MOD ID */
  modId: string;
  /** 权限列表 */
  permissions: string[];
  /** 可选权限列表 */
  optionalPermissions?: string[];
  /** 确认回调 */
  onConfirm: () => void;
  /** 取消回调 */
  onCancel: () => void;
  /** 是否显示 */
  isOpen: boolean;
  /** 语言 */
  lang?: 'zh' | 'en';
}

/**
 * 高风险权限列表
 */
const HIGH_RISK_PERMISSIONS = [
  'render:*',
  'satellite:*',
  'celestial:*',
  'time:*',
  'camera:*',
];

/**
 * 检查是否为高风险权限
 */
function isHighRiskPermission(permission: string): boolean {
  return HIGH_RISK_PERMISSIONS.some(pattern => {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return permission.startsWith(prefix);
    }
    return permission === pattern;
  });
}

/**
 * 权限确认对话框组件
 */
export function PermissionConfirmDialog({
  modName,
  modId,
  permissions,
  optionalPermissions = [],
  onConfirm,
  onCancel,
  isOpen,
  lang = 'zh',
}: PermissionConfirmDialogProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) {
    return null;
  }

  // 检查是否有高风险权限
  const allPermissions = [...permissions, ...optionalPermissions];
  const highRiskPerms = allPermissions.filter(isHighRiskPermission);
  const hasHighRisk = highRiskPerms.length > 0;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white mb-2">
            {lang === 'zh' ? '权限确认' : 'Permission Confirmation'}
          </h2>
          <p className="text-sm text-white/60">
            {lang === 'zh'
              ? `MOD "${modName}" 请求以下权限:`
              : `MOD "${modName}" requests the following permissions:`}
          </p>
          <p className="text-xs text-white/40 mt-1">
            {lang === 'zh' ? 'MOD ID' : 'MOD ID'}: {modId}
          </p>
        </div>

        {/* 高风险警告 */}
        {hasHighRisk && (
          <div className="mx-6 mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-400 mb-1">
                  {lang === 'zh' ? '高风险权限警告' : 'High Risk Permissions Warning'}
                </h3>
                <p className="text-xs text-red-300">
                  {lang === 'zh'
                    ? `此 MOD 请求了 ${highRiskPerms.length} 个高风险权限,这些权限可能对系统产生重大影响。请确保您信任此 MOD 的来源。`
                    : `This MOD requests ${highRiskPerms.length} high-risk permissions that may significantly impact the system. Please ensure you trust the source of this MOD.`}
                </p>
                <div className="mt-2 space-y-1">
                  {highRiskPerms.map(perm => (
                    <code key={perm} className="block text-xs text-red-400 font-mono">
                      {perm}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 权限摘要 */}
        <div className="px-6 py-4 bg-white/5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-white/60 mb-1">
                {lang === 'zh' ? '必需权限' : 'Required Permissions'}
              </div>
              <div className="text-2xl font-bold text-blue-400">{permissions.length}</div>
            </div>
            <div>
              <div className="text-xs text-white/60 mb-1">
                {lang === 'zh' ? '可选权限' : 'Optional Permissions'}
              </div>
              <div className="text-2xl font-bold text-gray-400">{optionalPermissions.length}</div>
            </div>
          </div>
        </div>

        {/* 权限详情 */}
        <div className="flex-1 overflow-auto">
          {showDetails ? (
            <div className="p-6">
              <PermissionViewer
                permissions={permissions}
                optionalPermissions={optionalPermissions}
                showDescription={true}
                lang={lang}
              />
            </div>
          ) : (
            <div className="p-6">
              <button
                onClick={() => setShowDetails(true)}
                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all"
              >
                {lang === 'zh' ? '查看详细权限列表' : 'View Detailed Permission List'}
              </button>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="p-6 border-t border-white/10">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                hasHighRisk
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {lang === 'zh' ? '确认并安装' : 'Confirm and Install'}
            </button>
          </div>
          <p className="text-xs text-white/40 text-center mt-3">
            {lang === 'zh'
              ? '点击"确认并安装"即表示您同意授予此 MOD 所请求的权限'
              : 'Clicking "Confirm and Install" indicates that you agree to grant the permissions requested by this MOD'}
          </p>
        </div>
      </div>
    </div>
  );
}
