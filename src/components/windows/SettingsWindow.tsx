/**
 * SettingsWindow.tsx - macOS 风格设置窗口
 * 
 * 功能完整的设置窗口，包括：
 * - 语言选择
 * - 单位系统（公制/英制）
 * - 温度单位（摄氏度/华氏度）
 * - 地球控制（Cesium 开关、地球锁定）
 * - 无障碍功能（高对比度、减少动画）
 * - 键盘快捷键帮助
 * - 关于信息（从 package.json 动态获取版本）
 */

'use client';

import { useState } from 'react';
import { useSolarSystemStore } from '@/lib/state';
import { useEarthControlStore } from '@/lib/state/earthControlStore';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  getLocaleManager,
  type UnitSystem,
  type TemperatureUnit,
} from '@/lib/i18n/locale-manager';
import {
  enableHighContrastMode,
  disableHighContrastMode,
  isHighContrastEnabled,
} from '@/lib/accessibility/high-contrast';
import {
  enableReducedMotion,
  disableReducedMotion,
  isReducedMotionEnabled,
} from '@/lib/accessibility/reduced-motion';
// 从 package.json 导入版本号
import packageJson from '../../../package.json';

interface SettingsWindowProps {
  cameraController?: any;
}

export function SettingsWindow({ cameraController: _cameraController }: SettingsWindowProps) {
  const { t, lang } = useTranslation();
  const setLang = useSolarSystemStore((state) => state.setLang);
  
  // 地球控制
  const {
    cesiumEnabled,
    setCesiumEnabled,
    earthLockEnabled,
    setEarthLockEnabled,
  } = useEarthControlStore();

  // 国际化设置
  const localeManager = getLocaleManager();
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(
    localeManager.getPreferences().unitSystem
  );
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>(
    localeManager.getPreferences().temperatureUnit
  );

  // 无障碍设置
  const [highContrast, setHighContrast] = useState(isHighContrastEnabled());
  const [reducedMotion, setReducedMotion] = useState(isReducedMotionEnabled());

  // 单位系统切换
  const handleUnitSystemChange = (system: UnitSystem) => {
    setUnitSystem(system);
    localeManager.setUnitSystem(system);
    
    // 自动更新温度单位
    const newTempUnit = system === 'imperial' ? 'fahrenheit' : 'celsius';
    setTemperatureUnit(newTempUnit);
  };

  // 温度单位切换
  const handleTemperatureUnitChange = (unit: TemperatureUnit) => {
    setTemperatureUnit(unit);
    localeManager.setTemperatureUnit(unit);
  };

  // 高对比度切换
  const handleHighContrastToggle = () => {
    if (highContrast) {
      disableHighContrastMode();
      setHighContrast(false);
    } else {
      enableHighContrastMode();
      setHighContrast(true);
    }
  };

  // 减少动画切换
  const handleReducedMotionToggle = () => {
    if (reducedMotion) {
      disableReducedMotion();
      setReducedMotion(false);
    } else {
      enableReducedMotion();
      setReducedMotion(true);
    }
  };

  // 显示键盘快捷键
  const handleShowKeyboardShortcuts = () => {
    const event = new CustomEvent('showKeyboardShortcuts');
    window.dispatchEvent(event);
  };

  return (
    <div className="flex flex-col gap-4 p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
      {/* ========== 常规设置 ========== */}
      <section>
        <h2 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">
          {lang === 'zh' ? '常规' : 'General'}
        </h2>
        
        {/* 语言设置 */}
        <div className="mb-4">
          <label className="block text-sm text-white/70 mb-2">
            {t('settings.language')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLang('zh')}
              className={`py-2 px-3 rounded text-sm font-medium transition-all ${
                lang === 'zh'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => setLang('en')}
              className={`py-2 px-3 rounded text-sm font-medium transition-all ${
                lang === 'en'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* 单位系统 */}
        <div className="mb-4">
          <label className="block text-sm text-white/70 mb-2">
            {t('settings.unitSystem')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleUnitSystemChange('metric')}
              className={`py-2 px-3 rounded text-sm font-medium transition-all ${
                unitSystem === 'metric'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {t('settings.metric')}
            </button>
            <button
              onClick={() => handleUnitSystemChange('imperial')}
              className={`py-2 px-3 rounded text-sm font-medium transition-all ${
                unitSystem === 'imperial'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {t('settings.imperial')}
            </button>
          </div>
        </div>

        {/* 温度单位 */}
        <div>
          <label className="block text-sm text-white/70 mb-2">
            {t('settings.temperature')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleTemperatureUnitChange('celsius')}
              className={`py-2 px-3 rounded text-sm font-medium transition-all ${
                temperatureUnit === 'celsius'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {t('settings.celsius')}
            </button>
            <button
              onClick={() => handleTemperatureUnitChange('fahrenheit')}
              className={`py-2 px-3 rounded text-sm font-medium transition-all ${
                temperatureUnit === 'fahrenheit'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {t('settings.fahrenheit')}
            </button>
          </div>
        </div>
      </section>

      {/* 分隔线 */}
      <div className="h-px bg-white/10" />

      {/* ========== 地球控制 ========== */}
      <section>
        <h2 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">
          {lang === 'zh' ? '地球' : 'Earth'}
        </h2>
        
        {/* Cesium 地球 */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded mb-2">
          <div>
            <div className="text-sm font-medium text-white">
              {lang === 'zh' ? 'Cesium 地球' : 'Cesium Earth'}
            </div>
            <div className="text-xs text-white/50 mt-0.5">
              {lang === 'zh' ? '启用高精度 3D 地球渲染' : 'Enable high-precision 3D Earth rendering'}
            </div>
          </div>
          <button
            onClick={() => setCesiumEnabled(!cesiumEnabled)}
            className={`relative w-14 h-7 rounded-full transition-all ${
              cesiumEnabled ? 'bg-blue-500' : 'bg-white/20'
            }`}
            aria-label="Toggle Cesium"
          >
            <div
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-all ${
                cesiumEnabled ? 'left-7' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* 地球锁定 */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded">
          <div>
            <div className="text-sm font-medium text-white">
              {lang === 'zh' ? '地球锁定' : 'Earth Lock'}
            </div>
            <div className="text-xs text-white/50 mt-0.5">
              {lang === 'zh' ? '锁定地球自转' : 'Lock Earth rotation'}
            </div>
          </div>
          <button
            onClick={() => setEarthLockEnabled(!earthLockEnabled)}
            className={`relative w-14 h-7 rounded-full transition-all ${
              earthLockEnabled ? 'bg-blue-500' : 'bg-white/20'
            }`}
            aria-label="Toggle Earth Lock"
          >
            <div
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-all ${
                earthLockEnabled ? 'left-7' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </section>

      {/* 分隔线 */}
      <div className="h-px bg-white/10" />

      {/* ========== 无障碍 ========== */}
      <section>
        <h2 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">
          {t('settings.accessibility')}
        </h2>
        
        {/* 高对比度模式 */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded mb-2">
          <div>
            <div className="text-sm font-medium text-white">
              {t('settings.highContrast')}
            </div>
            <div className="text-xs text-white/50 mt-0.5">
              {lang === 'zh' ? 'WCAG AAA 对比度标准 (>7:1)' : 'WCAG AAA contrast standard (>7:1)'}
            </div>
          </div>
          <button
            onClick={handleHighContrastToggle}
            className={`relative w-14 h-7 rounded-full transition-all ${
              highContrast ? 'bg-blue-500' : 'bg-white/20'
            }`}
            aria-label="Toggle High Contrast"
          >
            <div
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-all ${
                highContrast ? 'left-7' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* 减少动画 */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded mb-2">
          <div>
            <div className="text-sm font-medium text-white">
              {t('settings.reducedMotion')}
            </div>
            <div className="text-xs text-white/50 mt-0.5">
              {lang === 'zh' ? '减少或禁用 UI 动画效果' : 'Reduce or disable UI animations'}
            </div>
          </div>
          <button
            onClick={handleReducedMotionToggle}
            className={`relative w-14 h-7 rounded-full transition-all ${
              reducedMotion ? 'bg-blue-500' : 'bg-white/20'
            }`}
            aria-label="Toggle Reduced Motion"
          >
            <div
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-all ${
                reducedMotion ? 'left-7' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* 键盘快捷键 */}
        <button
          onClick={handleShowKeyboardShortcuts}
          className="w-full p-3 bg-white/5 hover:bg-white/10 rounded transition-all text-left"
        >
          <div className="text-sm font-medium text-white">
            {t('settings.keyboardShortcuts')}
          </div>
          <div className="text-xs text-white/50 mt-0.5">
            {lang === 'zh' ? '查看所有可用的键盘快捷键' : 'View all available keyboard shortcuts'}
          </div>
        </button>
      </section>

      {/* 分隔线 */}
      <div className="h-px bg-white/10" />

      {/* ========== 关于 ========== */}
      <section>
        <h2 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">
          {lang === 'zh' ? '关于' : 'About'}
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-white/5 rounded">
            <span className="text-sm text-white/60">{t('common.version')}</span>
            <span className="text-sm font-mono font-medium text-white">{packageJson.version}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-white/5 rounded">
            <span className="text-sm text-white/60">{t('common.author')}</span>
            <span className="text-sm font-mono font-medium text-white">OPIC Team</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-white/5 rounded">
            <span className="text-sm text-white/60">{lang === 'zh' ? '项目' : 'Project'}</span>
            <span className="text-sm font-mono font-medium text-white">Open Integrated Cosmos</span>
          </div>
        </div>
      </section>
    </div>
  );
}
