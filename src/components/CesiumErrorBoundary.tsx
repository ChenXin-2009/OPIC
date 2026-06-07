/**
 * Cesium 专用错误边界
 * 
 * 专门处理 Cesium 渲染和初始化相关的错误。
 * 
 * 常见错误场景：
 * - WebGL 不支持
 * - Cesium ion token 无效
 * - 瓦片加载失败
 * - 资源路径错误
 * 
 * @example
 * ```tsx
 * <CesiumErrorBoundary>
 *   <CesiumViewer />
 * </CesiumErrorBoundary>
 * ```
 */

'use client';

import { Component, ReactNode, ErrorInfo } from 'react';

interface CesiumErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface CesiumErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: 'webgl' | 'cesium' | 'network' | 'unknown';
}

/**
 * Cesium 错误边界组件
 */
export class CesiumErrorBoundary extends Component<
  CesiumErrorBoundaryProps,
  CesiumErrorBoundaryState
> {
  constructor(props: CesiumErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: 'unknown',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<CesiumErrorBoundaryState> {
    // 分析错误类型
    let errorType: CesiumErrorBoundaryState['errorType'] = 'unknown';
    
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('webgl') || errorMessage.includes('opengl')) {
      errorType = 'webgl';
    } else if (errorMessage.includes('cesium') || errorMessage.includes('ion')) {
      errorType = 'cesium';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorType = 'network';
    }

    return {
      hasError: true,
      error,
      errorType,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Cesium 错误边界捕获到错误:', error);
    console.error('组件栈:', errorInfo.componentStack);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorType: 'unknown',
    });
  };

  /**
   * 根据错误类型返回建议
   */
  getErrorSuggestions(): string[] {
    const { errorType } = this.state;

    switch (errorType) {
      case 'webgl':
        return [
          '请确保您的浏览器支持 WebGL',
          '尝试更新显卡驱动程序',
          '检查浏览器的硬件加速是否启用',
          '尝试在其他浏览器中打开',
        ];
      
      case 'cesium':
        return [
          '检查 Cesium ion 访问令牌是否有效',
          '确认网络连接正常',
          '尝试清除浏览器缓存',
          '检查 Cesium 资源路径配置',
        ];
      
      case 'network':
        return [
          '检查网络连接',
          '确认防火墙或代理设置',
          '尝试刷新页面',
          '检查服务器状态',
        ];
      
      default:
        return [
          '尝试刷新页面',
          '清除浏览器缓存',
          '检查浏览器控制台获取更多信息',
        ];
    }
  }

  /**
   * 获取错误标题
   */
  getErrorTitle(): string {
    const { errorType } = this.state;

    switch (errorType) {
      case 'webgl':
        return 'WebGL 不可用';
      case 'cesium':
        return 'Cesium 初始化失败';
      case 'network':
        return '网络连接错误';
      default:
        return '地球视图加载失败';
    }
  }

  override render(): ReactNode {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError && error) {
      const suggestions = this.getErrorSuggestions();
      const title = this.getErrorTitle();

      return (
        <div className="flex items-center justify-center h-full bg-gray-900 text-white p-6">
          <div className="max-w-lg w-full bg-gray-800 rounded-lg shadow-xl p-6">
            {/* 错误图标 */}
            <div className="flex items-center mb-4">
              <svg
                className="w-10 h-10 text-orange-500 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h2 className="text-xl font-bold">{title}</h2>
            </div>

            {/* 错误消息 */}
            <p className="text-gray-300 mb-4">
              地球3D视图无法加载。您可以尝试以下解决方案：
            </p>

            {/* 建议列表 */}
            <ul className="list-disc list-inside text-gray-400 text-sm mb-6 space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>

            {/* 开发环境显示错误 */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-4 bg-gray-900 p-3 rounded text-xs">
                <summary className="cursor-pointer text-yellow-400 font-semibold">
                  技术详情
                </summary>
                <pre className="mt-2 text-gray-400 overflow-auto">
                  {error.toString()}
                </pre>
              </details>
            )}

            {/* 操作按钮 */}
            <button
              onClick={this.handleReset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              重新尝试加载
            </button>

            {/* 提示信息 */}
            <p className="mt-4 text-xs text-gray-500 text-center">
              注意：某些设备或浏览器可能不支持 3D 地球视图
            </p>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default CesiumErrorBoundary;
