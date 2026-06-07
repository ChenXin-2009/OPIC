/**
 * PermissionViewer.tsx - 权限查看组件
 * 
 * 显示 MOD 声明的权限列表,按类别分组
 */

'use client';
import { PermissionParser } from '@/lib/mod-manager/permission/PermissionParser';

/**
 * 权限查看器属性
 */
export interface PermissionViewerProps {
  /** 权限列表 */
  permissions: string[];
  /** 可选权限列表 */
  optionalPermissions?: string[];
  /** 是否显示描述 */
  showDescription?: boolean;
  /** 语言 */
  lang?: 'zh' | 'en';
}

/**
 * 权限类别
 */
const PERMISSION_CATEGORIES = {
  time: { zh: '时间控制', en: 'Time Control', icon: '⏰', color: '#3b82f6' },
  camera: { zh: '相机控制', en: 'Camera Control', icon: '📷', color: '#8b5cf6' },
  celestial: { zh: '天体数据', en: 'Celestial Data', icon: '🌍', color: '#10b981' },
  satellite: { zh: '卫星数据', en: 'Satellite Data', icon: '🛰️', color: '#f59e0b' },
  render: { zh: '渲染控制', en: 'Render Control', icon: '🎨', color: '#ef4444' },
  event: { zh: '事件系统', en: 'Event System', icon: '📡', color: '#06b6d4' },
  storage: { zh: '数据存储', en: 'Storage', icon: '💾', color: '#ec4899' },
};

/**
 * 获取权限类别
 */
function getPermissionCategory(permission: string): keyof typeof PERMISSION_CATEGORIES | 'other' {
  const api = permission.split(':')[0];
  if (api in PERMISSION_CATEGORIES) {
    return api as keyof typeof PERMISSION_CATEGORIES;
  }
  return 'other';
}

/**
 * 按类别分组权限
 */
function groupPermissionsByCategory(permissions: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  permissions.forEach(permission => {
    const category = getPermissionCategory(permission);
    const categoryKey = category === 'other' ? 'other' : category;
    
    if (!groups.has(categoryKey)) {
      groups.set(categoryKey, []);
    }
    groups.get(categoryKey)!.push(permission);
  });

  return groups;
}

/**
 * 权限项组件
 */
interface PermissionItemProps {
  permission: string;
  isOptional?: boolean;
  showDescription?: boolean;
  lang: 'zh' | 'en';
}

function PermissionItem({ permission, isOptional, showDescription, lang }: PermissionItemProps) {
  const description = PermissionParser.describeString(permission);
  const isWildcard = permission.includes('*');

  return (
    <div className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-blue-400">{permission}</code>
            {isWildcard && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                {lang === 'zh' ? '通配符' : 'Wildcard'}
              </span>
            )}
            {isOptional && (
              <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded">
                {lang === 'zh' ? '可选' : 'Optional'}
              </span>
            )}
          </div>
          {showDescription && description && (
            <p className="text-xs text-white/60 mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 权限类别组件
 */
interface PermissionCategoryProps {
  category: string;
  permissions: string[];
  optionalPermissions: Set<string>;
  showDescription?: boolean;
  lang: 'zh' | 'en';
}

function PermissionCategory({
  category,
  permissions,
  optionalPermissions,
  showDescription,
  lang,
}: PermissionCategoryProps) {
  const categoryInfo = category === 'other'
    ? { zh: '其他', en: 'Other', icon: '📦', color: '#6b7280' }
    : PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{categoryInfo.icon}</span>
        <h3 className="text-lg font-semibold text-white">
          {lang === 'zh' ? categoryInfo.zh : categoryInfo.en}
        </h3>
        <span className="px-2 py-0.5 bg-white/10 text-white/60 text-xs rounded">
          {permissions.length}
        </span>
      </div>
      <div className="space-y-2">
        {permissions.map(permission => (
          <PermissionItem
            key={permission}
            permission={permission}
            isOptional={optionalPermissions.has(permission)}
            showDescription={showDescription}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 权限查看器组件
 */
export function PermissionViewer({
  permissions,
  optionalPermissions = [],
  showDescription = true,
  lang = 'zh',
}: PermissionViewerProps) {
  const allPermissions = [...permissions, ...optionalPermissions];
  const optionalSet = new Set(optionalPermissions);
  const groupedPermissions = groupPermissionsByCategory(allPermissions);

  if (allPermissions.length === 0) {
    return (
      <div className="text-center text-white/60 py-8">
        {lang === 'zh' ? '此 MOD 未声明任何权限' : 'This MOD has not declared any permissions'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-white/60 mb-1">
            {lang === 'zh' ? '总权限' : 'Total'}
          </div>
          <div className="text-2xl font-bold text-white">{allPermissions.length}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-white/60 mb-1">
            {lang === 'zh' ? '必需' : 'Required'}
          </div>
          <div className="text-2xl font-bold text-blue-400">{permissions.length}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-white/60 mb-1">
            {lang === 'zh' ? '可选' : 'Optional'}
          </div>
          <div className="text-2xl font-bold text-gray-400">{optionalPermissions.length}</div>
        </div>
      </div>

      {/* 权限列表 */}
      <div>
        {Array.from(groupedPermissions.entries()).map(([category, perms]) => (
          <PermissionCategory
            key={category}
            category={category}
            permissions={perms}
            optionalPermissions={optionalSet}
            showDescription={showDescription}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}
