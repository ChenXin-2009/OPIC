'use client';

/**
 * MOD列表组件
 * 
 * 显示所有已安装的MOD，支持搜索和过滤。
 */

import React, { useState, useMemo } from 'react';
import { useModStore } from '@/lib/mod-manager/store';

export interface ModListProps {
  /** 过滤状态 */
  filterState?: 'all' | 'enabled' | 'disabled';
  /** 搜索关键词 */
  searchQuery?: string;
  /** MOD点击回调 */
  onModClick?: (modId: string) => void;
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
    search: lang === 'zh' ? '搜索MOD...' : 'Search MODs...',
    noResults: lang === 'zh' ? '没有找到匹配的MOD' : 'No matching MODs found',
    noMods: lang === 'zh' ? '暂无已安装的MOD' : 'No installed MODs',
  };
}

/**
 * MOD列表组件
 */
export const ModList: React.FC<ModListProps> = ({
  filterState = 'all',
  searchQuery: externalSearchQuery,
  onModClick,
  lang = 'zh',
  className = '',
}) => {
  const t = getT(lang);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery ?? internalSearchQuery;

  const mods = useModStore((state) => state.mods);

  // 过滤和搜索
  const filteredMods = useMemo(() => {
    let result = Object.entries(mods);

    // 状态过滤
    if (filterState !== 'all') {
      result = result.filter(([, entry]) =>
        filterState === 'enabled'
          ? entry.state === 'enabled'
          : entry.state !== 'enabled'
      );
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(([, entry]) =>
        entry.manifest.name.toLowerCase().includes(query) ||
        entry.manifest.id.toLowerCase().includes(query) ||
        entry.manifest.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [mods, filterState, searchQuery]);

  return (
    <div className={`mod-list ${className}`}>
      {/* 搜索框 */}
      {externalSearchQuery === undefined && (
        <div className="mod-list__search mb-4">
          <input
            type="text"
            placeholder={t.search}
            value={internalSearchQuery}
            onChange={(e) => setInternalSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded text-white placeholder-gray-500 focus:outline-none focus:border-[#555]"
          />
        </div>
      )}

      {/* MOD列表 */}
      <div className="mod-list__items space-y-2">
        {filteredMods.length === 0 ? (
          <div className="mod-list__empty text-center text-gray-500 py-8">
            {searchQuery ? t.noResults : t.noMods}
          </div>
        ) : (
          filteredMods.map(([modId, entry]) => (
            <div
              key={modId}
              onClick={() => onModClick?.(modId)}
              className="p-3 border border-[#333] rounded-lg hover:bg-[#1a1a1a] cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{entry.manifest.name}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  entry.state === 'enabled' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'
                }`}>
                  {entry.state}
                </span>
              </div>
              {entry.manifest.description && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-1">{entry.manifest.description}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ModList;