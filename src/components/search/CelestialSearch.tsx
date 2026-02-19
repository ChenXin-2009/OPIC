/**
 * CelestialSearch.tsx - 天体搜索主容器组件
 * 
 * 功能：
 * - 集成 SearchBox 和 SuggestionList
 * - 实现键盘快捷键（Ctrl+K, /, Escape）
 * - 实现搜索防抖（150ms）
 * - 实现键盘导航（ArrowUp, ArrowDown, Enter）
 * - 实现搜索状态管理
 * - 实现加载指示器（搜索时间 > 50ms）
 * 
 * 需求：2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 8.1, 8.4
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import SearchBox from './SearchBox';
import SuggestionList, { type SearchResult } from './SuggestionList';
import { SearchEngine } from '@/lib/search/SearchEngine';
import { SearchIndex } from '@/lib/search/SearchIndex';
import { NavigationHandler } from '@/lib/search/NavigationHandler';
import { SearchHistory } from '@/lib/search/SearchHistory';
import { useSolarSystemStore } from '@/lib/state';
import type { SceneManager } from '@/lib/3d/SceneManager';
import type { CameraController } from '@/lib/3d/CameraController';

// ==================== 接口定义 ====================

/**
 * CelestialSearch 组件属性
 */
export interface CelestialSearchProps {
  /** SceneManager 实例（用于获取渲染器数据） */
  sceneManager: SceneManager;
  /** CameraController 实例（用于导航） */
  cameraController: CameraController;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * CelestialSearch 组件状态
 */
interface CelestialSearchState {
  /** 搜索框是否展开/聚焦 */
  isOpen: boolean;
  /** 当前搜索查询 */
  query: string;
  /** 搜索建议列表 */
  suggestions: SearchResult[];
  /** 当前选中的建议索引 */
  selectedIndex: number;
  /** 是否正在搜索 */
  isLoading: boolean;
  /** 是否显示历史记录 */
  showHistory: boolean;
}

// ==================== 配置常量 ====================

/** 搜索防抖延迟（毫秒） */
const SEARCH_DEBOUNCE_DELAY = 150;

/** 加载指示器显示延迟（毫秒） */
const LOADING_INDICATOR_DELAY = 50;

/** 最大搜索结果数量 */
const MAX_SEARCH_RESULTS = 10;

// ==================== CelestialSearch 组件 ====================

/**
 * CelestialSearch - 天体搜索主容器组件
 * 
 * 协调所有搜索相关的子组件和逻辑：
 * - SearchBox: 搜索输入框
 * - SuggestionList: 搜索建议列表
 * - SearchEngine: 搜索引擎
 * - SearchIndex: 天体索引
 * - NavigationHandler: 导航处理器
 * - SearchHistory: 历史记录管理
 */
export default function CelestialSearch({
  sceneManager,
  cameraController,
  className,
  style,
}: CelestialSearchProps) {
  // ==================== 状态管理 ====================
  
  const [state, setState] = useState<CelestialSearchState>({
    isOpen: false,
    query: '',
    suggestions: [],
    selectedIndex: -1,
    isLoading: false,
    showHistory: false,
  });

  // ==================== Refs ====================
  
  /** 搜索引擎实例 */
  const searchEngineRef = useRef<SearchEngine | null>(null);
  
  /** 搜索索引实例 */
  const searchIndexRef = useRef<SearchIndex | null>(null);
  
  /** 导航处理器实例 */
  const navigationHandlerRef = useRef<NavigationHandler | null>(null);
  
  /** 防抖定时器 */
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  /** 加载指示器定时器 */
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== Store ====================
  
  const store = useSolarSystemStore();
  const lang = useSolarSystemStore((state) => state.lang);

  // ==================== 初始化搜索引擎和索引 ====================
  
  useEffect(() => {
    try {
      // 创建搜索索引
      const searchIndex = new SearchIndex();
      searchIndexRef.current = searchIndex;

      // 从 Store 和渲染器构建索引
      const renderers = {
        localGroup: sceneManager.getLocalGroupRenderer(),
        nearbyGroups: sceneManager.getNearbyGroupsRenderer(),
        virgoSupercluster: sceneManager.getVirgoSuperclusterRenderer(),
        laniakeaSupercluster: sceneManager.getLaniakeaSuperclusterRenderer(),
      };

      searchIndex.buildFromStore(store, renderers);
      console.log(`搜索索引已构建，包含 ${searchIndex.size()} 个天体`);

      // 创建搜索引擎
      const searchEngine = new SearchEngine(searchIndex);
      searchEngineRef.current = searchEngine;

      // 创建导航处理器
      const navigationHandler = new NavigationHandler(
        sceneManager,
        cameraController,
        store
      );
      navigationHandlerRef.current = navigationHandler;
    } catch (error) {
      console.error('初始化搜索引擎失败:', error);
    }
  }, [sceneManager, cameraController, store]);

  // ==================== 搜索逻辑 ====================
  
  /**
   * 执行搜索
   */
  const performSearch = useCallback((query: string) => {
    if (!searchEngineRef.current) {
      console.warn('搜索引擎未初始化');
      return;
    }

    try {
      // 清除加载指示器定时器
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }

      // 空查询：显示历史记录或隐藏建议列表
      if (!query.trim()) {
        const history = SearchHistory.getAll();
        if (history.length > 0) {
          // 将历史记录转换为 SearchResult 格式
          const historyResults: SearchResult[] = history
            .map((entry) => {
              const celestial = searchIndexRef.current?.getById(entry.id);
              if (!celestial) {
                return null;
              }
              const result: SearchResult = {
                id: celestial.id,
                name: celestial.nameZh || celestial.nameEn,
                nameEn: celestial.nameEn,
                nameZh: celestial.nameZh,
                type: celestial.type,
                scale: celestial.scale,
                position: celestial.position,
                relevance: 0,
              };
              if (celestial.distance !== undefined) {
                result.distance = celestial.distance;
              }
              return result;
            })
            .filter((r): r is SearchResult => r !== null);

          setState((prev) => ({
            ...prev,
            suggestions: historyResults,
            showHistory: true,
            isLoading: false,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            suggestions: [],
            showHistory: false,
            isLoading: false,
          }));
        }
        return;
      }

      // 执行搜索
      const startTime = Date.now();
      const results = searchEngineRef.current.search(query, MAX_SEARCH_RESULTS);
      const searchTime = Date.now() - startTime;

      console.log(`搜索 "${query}" 完成，耗时 ${searchTime}ms，找到 ${results.length} 个结果`);

      setState((prev) => ({
        ...prev,
        suggestions: results,
        showHistory: false,
        isLoading: false,
        selectedIndex: results.length > 0 ? 0 : -1, // 自动选中第一个结果
      }));
    } catch (error) {
      console.error('搜索失败:', error);
      setState((prev) => ({
        ...prev,
        suggestions: [],
        showHistory: false,
        isLoading: false,
      }));
    }
  }, []);

  /**
   * 处理清空输入
   */
  const handleClear = useCallback(() => {
    setState((prev) => ({
      ...prev,
      query: '',
      suggestions: [],
      selectedIndex: -1,
    }));
    // 清空后显示历史记录
    performSearch('');
  }, [performSearch]);

  /**
   * 处理聚焦
   */
  const handleFocus = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }));
    // 如果输入为空，显示历史记录
    if (!state.query.trim()) {
      performSearch('');
    }
  }, [state.query, performSearch]);

  /**
   * 处理失焦
   */
  const handleBlur = useCallback(() => {
    // 延迟失焦，以便点击建议列表时能正确触发导航
    setTimeout(() => {
      setState((prev) => ({ ...prev, isOpen: false }));
    }, 200);
  }, []);

  /**
   * 处理悬停
   */
  const handleHover = useCallback((index: number) => {
    setState((prev) => ({ ...prev, selectedIndex: index }));
  }, []);

  /**
   * 处理输入变化（带防抖）
   */
  const handleInputChange = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      query: value,
      selectedIndex: -1,
    }));

    // 清除之前的防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 清除之前的加载指示器定时器
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }

    // 如果查询为空，立即执行搜索（显示历史记录）
    if (!value.trim()) {
      performSearch(value);
      return;
    }

    // 设置加载指示器定时器（如果搜索超过 50ms，显示加载指示器）
    loadingTimerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, isLoading: true }));
    }, LOADING_INDICATOR_DELAY);

    // 设置防抖定时器
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, SEARCH_DEBOUNCE_DELAY);
  }, [performSearch]);

  // ==================== 自动更新搜索索引 ====================
  
  /**
   * 监听天体数据变化，自动重建搜索索引
   * 需求：4.8
   */
  useEffect(() => {
    // 确保搜索引擎和索引已初始化
    if (!searchEngineRef.current || !searchIndexRef.current) {
      return;
    }

    try {
      console.log('检测到天体数据变化，重建搜索索引...');

      // 获取渲染器实例
      const renderers = {
        localGroup: sceneManager.getLocalGroupRenderer(),
        nearbyGroups: sceneManager.getNearbyGroupsRenderer(),
        virgoSupercluster: sceneManager.getVirgoSuperclusterRenderer(),
        laniakeaSupercluster: sceneManager.getLaniakeaSuperclusterRenderer(),
      };

      // 重建索引
      searchIndexRef.current.buildFromStore(store, renderers);
      console.log(`搜索索引已更新，包含 ${searchIndexRef.current.size()} 个天体`);

      // 更新搜索引擎的索引
      searchEngineRef.current.updateIndex(searchIndexRef.current);
      console.log('搜索引擎索引已更新');

      // 如果当前有搜索查询，重新执行搜索以更新结果
      if (state.query.trim()) {
        performSearch(state.query);
      }
    } catch (error) {
      console.error('更新搜索索引失败:', error);
    }
  }, [store.celestialBodies, sceneManager, store, state.query, performSearch]);

  // ==================== 导航逻辑 ====================
  
  /**
   * 导航到选中的天体
   */
  const navigateToResult = useCallback(async (result: SearchResult) => {
    if (!navigationHandlerRef.current || !searchIndexRef.current) {
      console.warn('导航处理器未初始化');
      return;
    }

    try {
      // 获取完整的天体数据
      const celestial = searchIndexRef.current.getById(result.id);
      if (!celestial) {
        console.error('未找到天体:', result.id);
        return;
      }

      // 执行导航
      await navigationHandlerRef.current.navigateTo(celestial);

      // 添加到历史记录
      SearchHistory.add({
        id: result.id,
        name: result.name,
        type: result.type,
      });

      // 清空输入并关闭建议列表
      setState({
        isOpen: false,
        query: '',
        suggestions: [],
        selectedIndex: -1,
        isLoading: false,
        showHistory: false,
      });

      console.log(`已导航到 ${result.name}`);
    } catch (error) {
      console.error('导航失败:', error);
      // 保持搜索框打开，显示错误提示
      // TODO: 添加错误提示 UI
    }
  }, []);

  // ==================== 键盘事件处理 ====================
  
  /**
   * 处理键盘导航
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ctrl+K 或 Cmd+K 或 / 键：聚焦搜索框
    if (
      (event.ctrlKey && event.key === 'k') ||
      (event.metaKey && event.key === 'k') ||
      event.key === '/'
    ) {
      event.preventDefault();
      setState((prev) => ({ ...prev, isOpen: true }));
      return;
    }

    // 只有在搜索框打开时才处理以下按键
    if (!state.isOpen) {
      return;
    }

    // Escape 键：清空输入并失焦
    if (event.key === 'Escape') {
      event.preventDefault();
      setState({
        isOpen: false,
        query: '',
        suggestions: [],
        selectedIndex: -1,
        isLoading: false,
        showHistory: false,
      });
      return;
    }

    // 只有在有建议列表时才处理方向键和 Enter 键
    if (state.suggestions.length === 0) {
      return;
    }

    // ArrowDown 键：选中下一个建议
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setState((prev) => ({
        ...prev,
        selectedIndex: (prev.selectedIndex + 1) % prev.suggestions.length,
      }));
      return;
    }

    // ArrowUp 键：选中上一个建议
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setState((prev) => ({
        ...prev,
        selectedIndex:
          prev.selectedIndex <= 0
            ? prev.suggestions.length - 1
            : prev.selectedIndex - 1,
      }));
      return;
    }

    // Enter 键：导航到选中的建议
    if (event.key === 'Enter' && state.selectedIndex >= 0) {
      event.preventDefault();
      const selectedResult = state.suggestions[state.selectedIndex];
      if (selectedResult) {
        navigateToResult(selectedResult);
      }
      return;
    }
  }, [state.isOpen, state.suggestions, state.selectedIndex, navigateToResult]);

  /**
   * 注册全局键盘事件监听器
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // ==================== 清理定时器 ====================
  
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);

  // ==================== 渲染 ====================
  
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '42rem',
        padding: '0 1rem',
        zIndex: 100,
        pointerEvents: 'none', // 允许点击穿透到下层
        ...style,
      }}
    >
      {/* 搜索框容器 */}
      <div style={{ pointerEvents: 'auto' }}>
        <SearchBox
          value={state.query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClear={handleClear}
          placeholder={lang === 'zh' ? '搜索天体（Ctrl+K 或 /）' : 'Search celestial objects (Ctrl+K or /)'}
          isFocused={state.isOpen}
        />
      </div>

      {/* 建议列表（包括空状态） */}
      {state.isOpen && state.query.trim() && (
        <div style={{ pointerEvents: 'auto' }}>
          <SuggestionList
            suggestions={state.suggestions}
            selectedIndex={state.selectedIndex}
            onSelect={navigateToResult}
            onHover={handleHover}
            lang={lang}
          />
        </div>
      )}

      {/* 加载指示器 */}
      {state.isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '0.5rem',
            padding: '0.5rem 1rem',
            background: '#0a0a0a',
            border: '1px solid #333333',
            borderRadius: '4px',
            color: '#ffffff',
            fontSize: '14px',
            pointerEvents: 'none',
          }}
        >
          {lang === 'zh' ? '搜索中...' : 'Searching...'}
        </div>
      )}
    </div>
  );
}
