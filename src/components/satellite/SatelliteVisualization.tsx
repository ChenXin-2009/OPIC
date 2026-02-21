/**
 * SatelliteVisualization - 卫星可视化容器组件
 * 
 * 组合所有卫星相关UI组件，处理生命周期和错误边界
 */

'use client';

import { Component, ReactNode } from 'react';
import { SatelliteControls } from './SatelliteControls';
import { SatelliteInfoPanel } from './SatelliteInfoPanel';
import { SatelliteStats } from './SatelliteStats';

// 明日方舟风格配置
const ARKNIGHTS_CONFIG = {
  colors: {
    primary: '#ffffff',
    secondary: '#e0e0e0',
    dark: '#0a0a0a',
    darkLight: '#1a1a1a',
    border: '#333333',
    text: '#ffffff',
    textDim: '#999999',
    error: '#ef4444',
  },
};

interface SatelliteVisualizationProps {
  lang?: 'zh' | 'en';
  children?: ReactNode;
}

interface SatelliteVisualizationState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 卫星可视化容器组件
 * 包含错误边界功能
 */
export class SatelliteVisualization extends Component<
  SatelliteVisualizationProps,
  SatelliteVisualizationState
> {
  constructor(props: SatelliteVisualizationProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): SatelliteVisualizationState {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[SatelliteVisualization] 错误:', error);
    console.error('[SatelliteVisualization] 错误信息:', errorInfo);
  }

  override componentWillUnmount(): void {
    // 清理资源
    console.log('[SatelliteVisualization] 组件卸载，清理资源');
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  override render(): ReactNode {
    const { lang = 'zh', children } = this.props;
    const { hasError, error } = this.state;

    // 错误状态
    if (hasError) {
      return (
        <div
          className="fixed z-50 flex items-center justify-center"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '24rem',
            background: ARKNIGHTS_CONFIG.colors.dark,
            border: `2px solid ${ARKNIGHTS_CONFIG.colors.error}`,
            clipPath:
              'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
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
              background: ARKNIGHTS_CONFIG.colors.error,
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
              background: ARKNIGHTS_CONFIG.colors.error,
              clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
            }}
          />

          <div className="p-6">
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
                  background: ARKNIGHTS_CONFIG.colors.error,
                }}
              />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: ARKNIGHTS_CONFIG.colors.error }}
              >
                {lang === 'zh' ? '错误' : 'ERROR'}
              </span>
            </div>

            <p
              className="text-sm mb-4"
              style={{ color: ARKNIGHTS_CONFIG.colors.text }}
            >
              {lang === 'zh'
                ? '卫星可视化组件发生错误'
                : 'Satellite visualization error occurred'}
            </p>

            {error && (
              <pre
                className="text-xs mb-4 p-2 overflow-auto max-h-32"
                style={{
                  background: ARKNIGHTS_CONFIG.colors.darkLight,
                  color: ARKNIGHTS_CONFIG.colors.textDim,
                  border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
                }}
              >
                {error.message}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
              style={{
                background: ARKNIGHTS_CONFIG.colors.error,
                color: ARKNIGHTS_CONFIG.colors.dark,
                border: `1px solid ${ARKNIGHTS_CONFIG.colors.error}`,
                clipPath:
                  'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
              }}
            >
              {lang === 'zh' ? '重试' : 'RETRY'}
            </button>
          </div>
        </div>
      );
    }

    // 正常渲染
    return (
      <>
        {/* 卫星控制面板 */}
        <SatelliteControls lang={lang} />

        {/* 卫星信息面板 */}
        <SatelliteInfoPanel lang={lang} />

        {/* 卫星统计信息 */}
        <SatelliteStats lang={lang} />

        {/* 子组件（如3D场景） */}
        {children}
      </>
    );
  }
}
