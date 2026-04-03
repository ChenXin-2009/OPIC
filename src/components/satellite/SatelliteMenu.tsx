/**
 * @module SatelliteMenu
 * @description 卫星菜单组件（明日方舟风格 UI）
 *
 * 架构层级：UI 层 → 卫星子系统
 * 职责：提供卫星数据的可视化控制界面，包含卫星显示开关、搜索过滤、
 *   数据刷新、选中卫星详情展示（轨道参数、基本信息）及轨道线切换。
 * 依赖：
 *   - `@/lib/store/useSatelliteStore`：全局卫星状态管理（Zustand store）
 *   - `@/lib/types/satellite`：卫星轨道类型枚举定义
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { OrbitType } from '@/lib/types/satellite';

/**
 * 明日方舟风格 UI 配色方案
 *
 * 各轨道类型对应颜色含义：
 * - `leo`（低地球轨道，200–2000 km）：蓝色 `#00aaff`，代表高频、活跃
 * - `meo`（中地球轨道，2000–35786 km）：绿色 `#00ff00`，代表中等高度
 * - `geo`（地球同步轨道，~35786 km）：红色 `#ff0000`，代表高轨、醒目
 * - `heo`（高椭圆轨道）：白色 `#ffffff`，代表特殊/极轨
 */
const ARKNIGHTS_CONFIG = {
  colors: {
    primary: '#ffffff',   // 主色：纯白，用于标题、主要文字
    secondary: '#e0e0e0', // 次要色：浅灰，用于数值显示
    accent: '#f0f0f0',    // 强调色：近白，用于高亮元素
    dark: '#0a0a0a',      // 深色背景：近黑
    darkLight: '#1a1a1a', // 次深色背景：用于卡片、输入框
    border: '#333333',    // 边框色：深灰
    text: '#ffffff',      // 正文色：白色
    textDim: '#999999',   // 暗文字色：灰色，用于标签、次要信息
    leo: '#00aaff',       // 低地球轨道（LEO）颜色：蓝色
    meo: '#00ff00',       // 中地球轨道（MEO）颜色：绿色
    geo: '#ff0000',       // 地球同步轨道（GEO）颜色：红色
    heo: '#ffffff',       // 高椭圆轨道（HEO）颜色：白色
  },
};

/**
 * SatelliteMenu 组件的 Props 接口
 */
interface SatelliteMenuProps {
  /** 界面显示语言；`'zh'` 为中文（默认），`'en'` 为英文 */
  lang?: 'zh' | 'en';
}

/**
 * 卫星菜单组件
 *
 * 提供卫星数据的可视化控制界面，包含：
 * - 卫星显示开关（在地球上显示/隐藏卫星点位）
 * - 搜索过滤（支持按名称搜索卫星）
 * - 数据刷新（手动触发 TLE 数据更新）
 * - 选中卫星详情展示（轨道参数、基本信息）
 * - 轨道线切换
 *
 * @param props - 组件属性
 * @param props.lang - 界面显示语言，`'zh'` 为中文（默认），`'en'` 为英文
 */
export function SatelliteMenu({ lang = 'zh' }: SatelliteMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    searchQuery,        // 当前生效的搜索关键词（已防抖，由 store 管理）
    showSatellites,     // 是否在地球上显示卫星点位
    visibleSatellites,  // 当前视口内可见的卫星 ID 集合
    lastUpdate,         // 最近一次 TLE 数据成功获取的时间戳
    loading,            // 是否正在请求卫星数据
    selectedSatellite,  // 当前选中的卫星 NORAD ID，未选中时为 null
    showOrbits,         // 已开启轨道线显示的卫星 ID 集合
    setSearchQuery,     // 更新 store 中的搜索关键词
    setShowSatellites,  // 切换卫星整体显示/隐藏
    fetchSatellites,    // 触发从远程获取最新 TLE 数据
    selectSatellite,    // 设置当前选中的卫星
    toggleOrbit,        // 切换指定卫星的轨道线显示状态
  } = useSatelliteStore();

  // 只在需要时获取选中的卫星数据
  const satellite = selectedSatellite 
    ? useSatelliteStore.getState().satellites.get(selectedSatellite) 
    : null;

  // 搜索防抖：用户停止输入 300ms 后才将关键词同步到 store，
  // 避免每次按键都触发卫星列表过滤计算，降低渲染开销。
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchQuery, setSearchQuery]);

  // 组件首次挂载时自动获取卫星数据（仅在 TLE 数据为空且未在加载中时触发）
  useEffect(() => {
    const state = useSatelliteStore.getState();
    // 只在没有数据时才自动获取
    if (state.tleData.size === 0 && !loading) {
      fetchSatellites();
    }
  }, [fetchSatellites, loading]);

  // 菜单展开时监听全局鼠标点击事件，点击面板和按钮以外的区域时自动关闭菜单；
  // 菜单关闭后移除监听器，避免不必要的事件处理开销。
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen]);

  /**
   * 将 Date 对象格式化为相对时间字符串（如"5分钟前"、"2小时前"）
   *
   * 格式化规则（支持中英文双语）：
   * - `null`：返回"未更新" / "Not updated"
   * - 不足 1 分钟：返回"刚刚" / "Just now"
   * - 1–59 分钟：返回"N分钟前" / "Nm ago"
   * - 1–23 小时：返回"N小时前" / "Nh ago"
   * - 24 小时以上：返回"N天前" / "Nd ago"
   *
   * @param date - 要格式化的时间，为 `null` 时表示从未更新
   * @returns 相对时间的本地化字符串
   */
  const formatUpdateTime = (date: Date | null) => {
    if (!date) return lang === 'zh' ? '未更新' : 'Not updated';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return lang === 'zh' ? '刚刚' : 'Just now';
    if (minutes < 60) return lang === 'zh' ? `${minutes}分钟前` : `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return lang === 'zh' ? `${hours}小时前` : `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return lang === 'zh' ? `${days}天前` : `${days}d ago`;
  };

  // 获取轨道类型颜色
  const getOrbitColor = (orbitType: OrbitType): string => {
    switch (orbitType) {
      case OrbitType.LEO:
        return ARKNIGHTS_CONFIG.colors.leo;
      case OrbitType.MEO:
        return ARKNIGHTS_CONFIG.colors.meo;
      case OrbitType.GEO:
        return ARKNIGHTS_CONFIG.colors.geo;
      case OrbitType.HEO:
        return ARKNIGHTS_CONFIG.colors.heo;
      default:
        return ARKNIGHTS_CONFIG.colors.text;
    }
  };

  // 获取轨道类型标签
  const getOrbitTypeLabel = (orbitType: OrbitType): string => {
    const labels = {
      [OrbitType.LEO]: { zh: '低轨', en: 'LEO' },
      [OrbitType.MEO]: { zh: '中轨', en: 'MEO' },
      [OrbitType.GEO]: { zh: '同步轨道', en: 'GEO' },
      [OrbitType.HEO]: { zh: '高椭圆轨道', en: 'HEO' },
    };
    return labels[orbitType]?.[lang] || orbitType;
  };

  // 计算轨道颜色和可见性
  const orbitColor = satellite ? getOrbitColor(satellite.orbitType) : ARKNIGHTS_CONFIG.colors.primary;
  const isOrbitVisible = selectedSatellite ? showOrbits.has(selectedSatellite) : false;

  return (
    <div style={{ position: 'relative' }}>
      {/* 卫星按钮 */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          display: 'block',
          width: '11rem',
          height: '3rem',
          background: ARKNIGHTS_CONFIG.colors.dark,
          border: `2px solid ${isHovered ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.border}`,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          color: ARKNIGHTS_CONFIG.colors.text,
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          boxShadow: isHovered ? '0 0 20px rgba(255, 255, 255, 0.5)' : 'none',
        }}
        aria-label={lang === 'zh' ? '地球卫星' : 'Earth Satellites'}
      >
        {/* 左上角菱形装饰 */}
        <div 
          style={{
            position: 'absolute',
            top: '-1px',
            left: '-1px',
            width: '12px',
            height: '12px',
            background: ARKNIGHTS_CONFIG.colors.primary,
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
          }}
        />
        
        {/* 右下角菱形装饰 */}
        <div 
          style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: '12px',
            height: '12px',
            background: ARKNIGHTS_CONFIG.colors.primary,
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
          }}
        />
        
        <div className="flex items-center justify-center gap-2 h-full px-3">
          {/* 卫星图标 */}
          <svg
            fill="none"
            stroke={ARKNIGHTS_CONFIG.colors.primary}
            viewBox="0 0 24 24"
            style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>

          <div className="flex flex-col items-start">
            <span
              className="text-xs font-bold uppercase tracking-wider leading-tight"
              style={{ color: ARKNIGHTS_CONFIG.colors.primary }}
            >
              {lang === 'zh' ? '地球卫星' : 'SATELLITES'}
            </span>
            <span
              className="text-[10px] uppercase tracking-wide leading-tight"
              style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
            >
              {isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>

          <div
            className="ml-auto"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isOpen ? ARKNIGHTS_CONFIG.colors.primary : '#00aaff',
              boxShadow: `0 0 8px ${isOpen ? ARKNIGHTS_CONFIG.colors.primary : '#00aaff'}`,
            }}
          />
        </div>
      </button>

      {/* 卫星菜单面板 — 向左展开，固定在视口右侧 */}
      {isOpen && (
        <div
          ref={menuRef}
          className="satellite-menu-scrollbar"
          style={{
            position: 'fixed',
            right: 'calc(1.5rem + 11rem + 0.75rem)',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1050,
            width: '22rem',
            maxHeight: 'calc(100vh - 6rem)',
            background: ARKNIGHTS_CONFIG.colors.dark,
            border: `2px solid ${ARKNIGHTS_CONFIG.colors.border}`,
            clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
            animation: 'slideIn 0.3s ease-out',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {/* 左上角装饰 */}
          <div 
            className="absolute"
            style={{
              top: '-1px',
              left: '-1px',
              width: '12px',
              height: '12px',
              background: ARKNIGHTS_CONFIG.colors.primary,
              clipPath: 'polygon(0 0, 100% 0, 0 100%)',
            }}
          />
          
          {/* 右下角装饰 */}
          <div 
            className="absolute"
            style={{
              bottom: '-1px',
              right: '-1px',
              width: '12px',
              height: '12px',
              background: ARKNIGHTS_CONFIG.colors.primary,
              clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
            }}
          />
          
          <div className="p-4">
            {/* 标题 */}
            <div
              className="flex items-center gap-2 pb-3 mb-4"
              style={{
                borderBottom: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
              }}
            >
              <div
                style={{
                  width: '4px',
                  height: '16px',
                  background: ARKNIGHTS_CONFIG.colors.primary,
                }}
              />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: ARKNIGHTS_CONFIG.colors.text }}
              >
                {lang === 'zh' ? '卫星控制' : 'SATELLITE CONTROL'}
              </span>
            </div>

            {/* 可见性开关 */}
            <div className="mb-4">
              <button
                onClick={() => setShowSatellites(!showSatellites)}
                className="w-full py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
                style={{
                  background: showSatellites
                    ? ARKNIGHTS_CONFIG.colors.primary
                    : ARKNIGHTS_CONFIG.colors.darkLight,
                  color: showSatellites
                    ? ARKNIGHTS_CONFIG.colors.dark
                    : ARKNIGHTS_CONFIG.colors.textDim,
                  border: `1px solid ${
                    showSatellites
                      ? ARKNIGHTS_CONFIG.colors.primary
                      : ARKNIGHTS_CONFIG.colors.border
                  }`,
                  clipPath:
                    'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                }}
              >
                {showSatellites
                  ? lang === 'zh'
                    ? '隐藏卫星'
                    : 'HIDE SATELLITES'
                  : lang === 'zh'
                  ? '显示卫星'
                  : 'SHOW SATELLITES'}
              </button>
            </div>

            {/* 搜索栏 */}
            <div className="mb-4">
              <label
                className="text-xs uppercase tracking-wide block mb-2"
                style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
              >
                {lang === 'zh' ? '搜索' : 'SEARCH'}
              </label>
              <input
                type="text"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                placeholder={
                  lang === 'zh' ? '名称或NORAD ID...' : 'Name or NORAD ID...'
                }
                className="w-full px-3 py-2 text-xs font-mono"
                style={{
                  background: ARKNIGHTS_CONFIG.colors.darkLight,
                  color: ARKNIGHTS_CONFIG.colors.text,
                  border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
                  clipPath:
                    'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                  outline: 'none',
                }}
              />
            </div>

            {/* 数据状态 */}
            <div
              className="p-3 mb-4"
              style={{
                background: ARKNIGHTS_CONFIG.colors.darkLight,
                border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
                clipPath:
                  'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <span
                  className="text-xs uppercase tracking-wide"
                  style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                >
                  {lang === 'zh' ? '可见卫星' : 'VISIBLE'}
                </span>
                <span
                  className="text-sm font-bold font-mono"
                  style={{ color: ARKNIGHTS_CONFIG.colors.primary }}
                >
                  {visibleSatellites.size}
                </span>
              </div>

              <div className="flex justify-between items-center mb-3">
                <span
                  className="text-xs uppercase tracking-wide"
                  style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                >
                  {lang === 'zh' ? '更新时间' : 'UPDATED'}
                </span>
                <span
                  className="text-xs font-mono"
                  style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                >
                  {formatUpdateTime(lastUpdate)}
                </span>
              </div>

              <button
                onClick={() => fetchSatellites()}
                disabled={loading}
                className="w-full py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
                style={{
                  background: loading
                    ? ARKNIGHTS_CONFIG.colors.darkLight
                    : ARKNIGHTS_CONFIG.colors.dark,
                  color: loading
                    ? ARKNIGHTS_CONFIG.colors.textDim
                    : ARKNIGHTS_CONFIG.colors.text,
                  border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
                  clipPath:
                    'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading
                  ? lang === 'zh'
                    ? '刷新中...'
                    : 'REFRESHING...'
                  : lang === 'zh'
                  ? '刷新数据'
                  : 'REFRESH DATA'}
              </button>
            </div>

            {/* 选中卫星信息 */}
            {satellite && (
              <>
                {/* 分隔线 */}
                <div 
                  style={{
                    height: '1px',
                    background: ARKNIGHTS_CONFIG.colors.border,
                    marginBottom: '1rem',
                  }}
                />

                {/* 卫星信息标题 */}
                <div
                  className="flex items-center justify-between pb-3 mb-4"
                  style={{
                    borderBottom: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: '4px',
                        height: '16px',
                        background: orbitColor,
                      }}
                    />
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: ARKNIGHTS_CONFIG.colors.text }}
                    >
                      {lang === 'zh' ? '卫星信息' : 'SATELLITE INFO'}
                    </span>
                  </div>
                  <button
                    onClick={() => selectSatellite(null)}
                    className="text-xs hover:opacity-70 transition-opacity"
                    style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                  >
                    ✕
                  </button>
                </div>

                {/* 卫星名称 */}
                <div className="mb-4">
                  <h3
                    className="text-base font-bold mb-1"
                    style={{ color: ARKNIGHTS_CONFIG.colors.text }}
                  >
                    {satellite.name}
                  </h3>
                  <span
                    className="text-xs px-2 py-0.5 font-bold uppercase tracking-wide inline-block"
                    style={{
                      background: `${orbitColor}20`,
                      color: orbitColor,
                      border: `1px solid ${orbitColor}`,
                    }}
                  >
                    {getOrbitTypeLabel(satellite.orbitType)}
                  </span>
                </div>

                {/* 基本信息 */}
                <div className="mb-4">
                  <h4
                    className="text-xs uppercase tracking-wide mb-2"
                    style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                  >
                    {lang === 'zh' ? '基本信息' : 'BASIC INFO'}
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        NORAD ID
                      </span>
                      <span
                        className="font-mono font-bold"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.noradId}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '高度' : 'ALTITUDE'}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.altitude.toFixed(2)} km
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '速度' : 'VELOCITY'}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.velocity.length().toFixed(2)} km/s
                      </span>
                    </div>
                  </div>
                </div>

                {/* 轨道参数 */}
                <div className="mb-4">
                  <h4
                    className="text-xs uppercase tracking-wide mb-2"
                    style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                  >
                    {lang === 'zh' ? '轨道参数' : 'ORBITAL PARAMETERS'}
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '倾角' : 'INCLINATION'}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.orbitalElements.inclination.toFixed(2)}°
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '偏心率' : 'ECCENTRICITY'}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.orbitalElements.eccentricity.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '周期' : 'PERIOD'}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.orbitalElements.period.toFixed(2)}{' '}
                        {lang === 'zh' ? '分钟' : 'min'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '半长轴' : 'SEMI-MAJOR AXIS'}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.orbitalElements.semiMajorAxis.toFixed(2)} km
                      </span>
                    </div>
                  </div>
                </div>

                {/* 轨道控制按钮 */}
                <button
                  onClick={() => selectedSatellite && toggleOrbit(selectedSatellite)}
                  className="w-full py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
                  style={{
                    background: isOrbitVisible
                      ? `${orbitColor}20`
                      : ARKNIGHTS_CONFIG.colors.darkLight,
                    color: isOrbitVisible ? orbitColor : ARKNIGHTS_CONFIG.colors.text,
                    border: `1px solid ${
                      isOrbitVisible ? orbitColor : ARKNIGHTS_CONFIG.colors.border
                    }`,
                    clipPath:
                      'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                  }}
                >
                  {isOrbitVisible
                    ? lang === 'zh'
                      ? '隐藏轨道'
                      : 'HIDE ORBIT'
                    : lang === 'zh'
                    ? '显示轨道'
                    : 'SHOW ORBIT'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
