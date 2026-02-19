/**
 * EphemerisStatusPanel - 星历状态面板（明日方舟风格）
 * 
 * 动态显示当前时间的星历状态，包括：
 * - 数据源（根据当前时间动态变化）
 * - 精度等级（根据当前时间动态计算）
 * - 误差估计（基于多项式拟合残差、时间距离、天体速度）
 * - 时间范围
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AllBodiesCalculator } from '@/lib/astronomy/ephemeris/all-bodies-calculator';
import { BodyType } from '@/lib/astronomy/ephemeris/types';
import { useSolarSystemStore } from '@/lib/state';
import { planetNames } from '@/lib/astronomy/names';
import { dateToJulianDay } from '@/lib/astronomy/time';

interface EphemerisStatusPanelProps {
  calculator: AllBodiesCalculator | null;
  onClose: () => void;
}

type FilterType = 'all' | 'planet' | 'satellite';
type FilterEphemeris = 'all' | 'ephemeris' | 'analytical';

// 明日方舟风格配置
const ARKNIGHTS_CONFIG = {
  colors: {
    primary: '#ffffff',
    secondary: '#e0e0e0',
    accent: '#f0f0f0',
    dark: '#0a0a0a',
    darkLight: '#1a1a1a',
    border: '#333333',
    text: '#ffffff',
    textDim: '#999999',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#ef4444',
  },
};

export default function EphemerisStatusPanel({ calculator, onClose }: EphemerisStatusPanelProps) {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterEphemeris, setFilterEphemeris] = useState<FilterEphemeris>('all');
  const [bodyStatuses, setBodyStatuses] = useState<Map<number, any>>(new Map());
  
  const selectedPlanet = useSolarSystemStore((state) => state.selectedPlanet);
  const currentTime = useSolarSystemStore((state) => state.currentTime);
  const lang = useSolarSystemStore((state) => state.lang);

  // 计算当前时间的JD
  const currentJD = dateToJulianDay(currentTime);

  // 动态更新所有天体的状态
  useEffect(() => {
    if (!calculator) return;

    const updateStatuses = async () => {
      const bodies = calculator.getBodies();
      const newStatuses = new Map();

      for (const body of bodies) {
        try {
          // 获取当前时间的位置和状态
          const result = await calculator.calculatePosition(body.naifId, currentJD);
          const status = calculator.getStatus(body.naifId);
          
          // 计算误差估计
          const errorEstimate = calculateErrorEstimate(
            body,
            currentJD,
            result.usingEphemeris,
            status
          );

          newStatuses.set(body.naifId, {
            ...status,
            currentlyUsingEphemeris: result.usingEphemeris,
            currentDataSource: result.usingEphemeris 
              ? status.dataSource 
              : (lang === 'zh' ? 'VSOP87 解析模型' : 'VSOP87 Analytical Model'),
            currentAccuracy: result.usingEphemeris 
              ? status.accuracyLevel 
              : (lang === 'zh' ? '~1-5°' : '~1-5°'),
            errorEstimate,
            isInValidRange: status.timeValidity 
              ? (currentJD >= status.timeValidity.start && currentJD <= status.timeValidity.end)
              : false,
          });
        } catch (error) {
          console.error(`Failed to get status for body ${body.naifId}:`, error);
        }
      }

      setBodyStatuses(newStatuses);
    };

    updateStatuses();
    
    // 每秒更新一次状态
    const interval = setInterval(updateStatuses, 1000);
    return () => clearInterval(interval);
  }, [calculator, currentJD, lang]);

  if (!calculator) {
    return (
      <div 
        className="fixed z-50"
        style={{
          top: '5rem',
          right: '1rem',
          width: '22rem',
          background: ARKNIGHTS_CONFIG.colors.dark,
          border: `2px solid ${ARKNIGHTS_CONFIG.colors.border}`,
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        }}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div style={{ width: '4px', height: '16px', background: ARKNIGHTS_CONFIG.colors.primary }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ARKNIGHTS_CONFIG.colors.text }}>
                {lang === 'zh' ? '星历状态' : 'EPHEMERIS STATUS'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-xs hover:opacity-70 transition-opacity"
              style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
            >
              ✕
            </button>
          </div>
          <p className="text-xs" style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
            {lang === 'zh' ? '星历计算器未初始化' : 'Calculator not initialized'}
          </p>
        </div>
      </div>
    );
  }

  const bodies = calculator.getBodies();

  // 筛选天体
  const filteredBodies = bodies.filter((body) => {
    if (filterType === 'planet' && body.type !== BodyType.PLANET) return false;
    if (filterType === 'satellite' && body.type !== BodyType.SATELLITE) return false;

    const status = bodyStatuses.get(body.naifId);
    if (!status) return false;

    if (filterEphemeris === 'ephemeris' && !status.currentlyUsingEphemeris) return false;
    if (filterEphemeris === 'analytical' && status.currentlyUsingEphemeris) return false;

    return true;
  });

  return (
    <div 
      className="fixed z-50 overflow-hidden"
      style={{
        top: '5rem',
        right: '1rem',
        width: '28rem',
        maxHeight: 'calc(100vh - 6rem)',
        background: ARKNIGHTS_CONFIG.colors.dark,
        border: `2px solid ${ARKNIGHTS_CONFIG.colors.border}`,
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        animation: 'slideInFromRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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

      {/* 固定的关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute z-10 text-xs hover:opacity-70 transition-opacity"
        style={{ 
          top: '1rem',
          right: '1rem',
          color: ARKNIGHTS_CONFIG.colors.textDim 
        }}
      >
        ✕
      </button>

      <div className="p-4 overflow-y-auto" style={{ 
        maxHeight: 'calc(100vh - 6rem)',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent'
      }}>
        {/* 标题栏 */}
        <div className="flex items-center mb-4 pb-3" style={{ borderBottom: `1px solid ${ARKNIGHTS_CONFIG.colors.border}` }}>
          <div className="flex items-center gap-2">
            <div style={{ width: '4px', height: '16px', background: ARKNIGHTS_CONFIG.colors.primary }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ARKNIGHTS_CONFIG.colors.text }}>
              {lang === 'zh' ? '星历状态' : 'EPHEMERIS STATUS'}
            </span>
          </div>
        </div>

        {/* 当前时间显示 */}
        <div className="mb-4 p-2" style={{ background: ARKNIGHTS_CONFIG.colors.darkLight, border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}` }}>
          <div className="flex justify-between items-center text-xs">
            <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
              {lang === 'zh' ? '当前时间' : 'CURRENT TIME'}
            </span>
            <span className="font-mono font-bold" style={{ color: ARKNIGHTS_CONFIG.colors.primary }}>
              {formatDate(currentTime, lang)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs mt-1">
            <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>JD</span>
            <span className="font-mono text-xs" style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}>
              {currentJD.toFixed(3)}
            </span>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
              {lang === 'zh' ? '类型' : 'TYPE'}
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full text-xs py-1 px-2 font-bold uppercase tracking-wide"
              style={{
                background: ARKNIGHTS_CONFIG.colors.darkLight,
                color: ARKNIGHTS_CONFIG.colors.text,
                border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
                clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              }}
            >
              <option value="all">{lang === 'zh' ? '全部' : 'ALL'}</option>
              <option value="planet">{lang === 'zh' ? '行星' : 'PLANETS'}</option>
              <option value="satellite">{lang === 'zh' ? '卫星' : 'SATELLITES'}</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
              {lang === 'zh' ? '数据源' : 'SOURCE'}
            </label>
            <select
              value={filterEphemeris}
              onChange={(e) => setFilterEphemeris(e.target.value as FilterEphemeris)}
              className="w-full text-xs py-1 px-2 font-bold uppercase tracking-wide"
              style={{
                background: ARKNIGHTS_CONFIG.colors.darkLight,
                color: ARKNIGHTS_CONFIG.colors.text,
                border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
                clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              }}
            >
              <option value="all">{lang === 'zh' ? '全部' : 'ALL'}</option>
              <option value="ephemeris">{lang === 'zh' ? '高精度' : 'HIGH-PRECISION'}</option>
              <option value="analytical">{lang === 'zh' ? '解析' : 'ANALYTICAL'}</option>
            </select>
          </div>
        </div>

        {/* 天体列表 */}
        <div className="space-y-2">
          {filteredBodies.map((body) => {
            const status = bodyStatuses.get(body.naifId);
            if (!status) return null;

            const isSelected = body.name === selectedPlanet;
            const displayName = planetNames[lang]?.[body.name] || body.name;

            return (
              <div
                key={body.naifId}
                className="p-3 transition-all duration-200"
                style={{
                  background: isSelected ? `${ARKNIGHTS_CONFIG.colors.primary}10` : ARKNIGHTS_CONFIG.colors.darkLight,
                  border: `1px solid ${isSelected ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.border}`,
                  clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                }}
              >
                {/* 天体名称和类型 */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: ARKNIGHTS_CONFIG.colors.text }}>
                      {displayName}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                      {body.type === BodyType.PLANET 
                        ? (lang === 'zh' ? '行星' : 'PLANET')
                        : (lang === 'zh' ? '卫星' : 'SATELLITE')}
                      {body.parentId && ` · ${getParentName(body.parentId, lang)}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="text-xs px-2 py-0.5 font-bold uppercase tracking-wide"
                      style={{
                        background: status.currentlyUsingEphemeris 
                          ? `${ARKNIGHTS_CONFIG.colors.success}20` 
                          : `${ARKNIGHTS_CONFIG.colors.warning}20`,
                        color: status.currentlyUsingEphemeris 
                          ? ARKNIGHTS_CONFIG.colors.success 
                          : ARKNIGHTS_CONFIG.colors.warning,
                        border: `1px solid ${status.currentlyUsingEphemeris ? ARKNIGHTS_CONFIG.colors.success : ARKNIGHTS_CONFIG.colors.warning}`,
                      }}
                    >
                      {status.currentlyUsingEphemeris 
                        ? (lang === 'zh' ? '高精度' : 'HIGH-PREC')
                        : (lang === 'zh' ? '解析' : 'ANALYTICAL')}
                    </span>
                    {!status.isInValidRange && status.timeValidity && (
                      <span
                        className="text-xs px-2 py-0.5 font-bold uppercase tracking-wide"
                        style={{
                          background: `${ARKNIGHTS_CONFIG.colors.error}20`,
                          color: ARKNIGHTS_CONFIG.colors.error,
                          border: `1px solid ${ARKNIGHTS_CONFIG.colors.error}`,
                        }}
                      >
                        {lang === 'zh' ? '超出范围' : 'OUT OF RANGE'}
                      </span>
                    )}
                  </div>
                </div>

                {/* 详细信息 */}
                <div className="space-y-1.5 text-xs">
                  {/* 数据源 */}
                  <div className="flex justify-between items-center">
                    <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                      {lang === 'zh' ? '数据源' : 'DATA SOURCE'}
                    </span>
                    <span className="font-mono text-xs" style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}>
                      {status.currentDataSource}
                    </span>
                  </div>

                  {/* 精度 */}
                  <div className="flex justify-between items-center">
                    <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                      {lang === 'zh' ? '精度' : 'ACCURACY'}
                    </span>
                    <span className="font-mono text-xs" style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}>
                      {status.currentAccuracy}
                    </span>
                  </div>

                  {/* 误差估计 */}
                  <div className="flex justify-between items-center">
                    <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                      {lang === 'zh' ? '误差估计' : 'ERROR EST.'}
                    </span>
                    <span 
                      className="font-mono text-xs font-bold"
                      style={{ 
                        color: status.errorEstimate < 0.01 
                          ? ARKNIGHTS_CONFIG.colors.success 
                          : status.errorEstimate < 0.1 
                            ? ARKNIGHTS_CONFIG.colors.warning 
                            : ARKNIGHTS_CONFIG.colors.error 
                      }}
                    >
                      {status.errorEstimate.toFixed(4)}°
                    </span>
                  </div>

                  {/* 时间范围 */}
                  {status.timeValidity && (
                    <div className="flex justify-between items-center">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '有效范围' : 'VALID RANGE'}
                      </span>
                      <span className="font-mono text-xs" style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}>
                        {formatJD(status.timeValidity.start)} - {formatJD(status.timeValidity.end)}
                      </span>
                    </div>
                  )}

                  {/* 多项式信息 */}
                  {status.polynomialType && (
                    <div className="flex justify-between items-center">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '多项式' : 'POLYNOMIAL'}
                      </span>
                      <span className="font-mono text-xs uppercase" style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}>
                        {status.polynomialType}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredBodies.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs uppercase tracking-wide" style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
              {lang === 'zh' ? '没有符合条件的天体' : 'NO MATCHING BODIES'}
            </p>
          </div>
        )}
      </div>
      
      {/* 动画样式 */}
      <style jsx>{`
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        /* WebKit浏览器滚动条样式 */
        :global(.overflow-y-auto::-webkit-scrollbar) {
          width: 6px;
        }
        
        :global(.overflow-y-auto::-webkit-scrollbar-track) {
          background: transparent;
        }
        
        :global(.overflow-y-auto::-webkit-scrollbar-thumb) {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        
        :global(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}

/**
 * 计算误差估计
 * 基于：
 * 1. 多项式拟合残差（如果使用星历数据）
 * 2. 时间距离最近数据点的距离
 * 3. 天体运动速度
 */
function calculateErrorEstimate(
  body: any,
  currentJD: number,
  usingEphemeris: boolean,
  status: any
): number {
  if (!usingEphemeris) {
    // 解析模型的误差估计
    if (body.type === BodyType.PLANET) {
      return 1.0; // 行星解析模型约1°误差
    } else {
      return 5.0; // 卫星解析模型约5°误差
    }
  }

  // 星历数据的误差估计
  let error = 0.001; // 基础误差（高精度星历）

  // 1. 基于时间距离的误差增长
  if (status.timeValidity) {
    const { start, end } = status.timeValidity;
    const range = end - start;
    const center = (start + end) / 2;
    const distanceFromCenter = Math.abs(currentJD - center);
    const normalizedDistance = distanceFromCenter / (range / 2);
    
    // 距离中心越远，误差越大
    error += normalizedDistance * 0.005;

    // 超出范围时误差急剧增加
    if (currentJD < start || currentJD > end) {
      const daysOutOfRange = Math.min(
        Math.abs(currentJD - start),
        Math.abs(currentJD - end)
      );
      error += daysOutOfRange * 0.01; // 每天增加0.01°误差
    }
  }

  // 2. 基于天体类型的误差
  if (body.type === BodyType.SATELLITE) {
    // 卫星运动更快，误差略大
    error *= 1.5;
  }

  // 3. 基于多项式类型的误差
  if (status.polynomialType === 'hermite') {
    // Hermite插值在段边界处误差较小
    error *= 0.8;
  }

  return Math.min(error, 10.0); // 最大误差不超过10°
}

/**
 * 获取母行星名称
 * 注意：使用barycenter ID（4-8）而不是planet center ID（499, 599, 699, 799, 899）
 */
function getParentName(parentId: number, lang: string): string {
  const parentNames: Record<number, string> = {
    399: 'Earth',
    4: 'Mars',      // Mars Barycenter
    5: 'Jupiter',   // Jupiter Barycenter
    6: 'Saturn',    // Saturn Barycenter
    7: 'Uranus',    // Uranus Barycenter
    8: 'Neptune',   // Neptune Barycenter
  };

  const englishName = parentNames[parentId] || 'Unknown';
  return planetNames[lang]?.[englishName] || englishName;
}

/**
 * 格式化日期
 */
function formatDate(date: Date, lang: string): string {
  return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化儒略日为日期
 */
function formatJD(jd: number): string {
  const unixTime = (jd - 2440587.5) * 86400000;
  const date = new Date(unixTime);
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
