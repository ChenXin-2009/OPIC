/**
 * Canvas 错误边界组件
 * 
 * 专门用于捕获 Three.js 和 Canvas 渲染相关的错误
 * 
 * 功能：
 * - 捕获 WebGL 和 Canvas 渲染错误
 * - 提供降级渲染器选项（css3d, canvas2d）
 * - 显示友好的错误提示
 * - 提供重试和降级选项
 * 
 * @example
 * ```tsx
 * <CanvasErrorBoundary fallbackRenderer="css3d">
 *   <ThreeJSScene />
 * </CanvasErrorBoundary>
 * ```
 */

'use client';

import { Component, ReactNode, ErrorInfo } from 'react';

/**
 * 降级渲染器类型
 */
export type FallbackRenderer = 'css3d' | 'canvas2d' | null;

/**
 * Canvas 错误边界 Props
 */
export interface CanvasErrorBoundaryProps {
  /** 子组件 */
  children: ReactNode;
  
  /** 降级渲染器选项 */
  fallbackRenderer?: FallbackRenderer;
  
  /** 错误回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  
  /** 组件名称 */
  componentName?: string;
  
  /** 自定义降级 UI */
  fallback?: ReactNode;
}

/**
 * Canvas 错误边界 State
 */
export interface CanvasErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isWebGLAvailable: boolean;
  currentRenderer: 'webgl' | FallbackRenderer;
  retryCount: number;
}

/**
 * 检查 WebGL 可用性
 */
function checkWebGLAvailability(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

/**
 * 检测错误类型
 */
function detectErrorType(error: Error): 'webgl' | 'memory' | 'rendering' | 'unknown' {
  const message = error.message.toLowerCase();
  
  if (message.includes('webgl') || message.includes('context lost')) {
    return 'webgl';
  }
  
  if (message.includes('memory') || message.includes('out of memory')) {
    return 'memory';
  }
  
  if (message.includes('render') || message.includes('draw')) {
    return 'rendering';
  }
  
  return 'unknown';
}

/**
 * Canvas 错误边界组件
 */
export class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  constructor(props: CanvasErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isWebGLAvailable: checkWebGLAvailability(),
      currentRenderer: 'webgl',
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<CanvasErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // 记录错误
    console.error('========================================');
    console.error('CanvasErrorBoundary caught an error');
    console.error('========================================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Type:', detectErrorType(error));
    console.error('WebGL Available:', this.state.isWebGLAvailable);
    console.error('========================================');

    // 调用自定义错误处理器
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * 重试渲染
   */
  handleRetry = (): void => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  /**
   * 切换到降级渲染器
   */
  handleUseFallback = (renderer: FallbackRenderer): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      currentRenderer: renderer,
    });
  };

  override render(): ReactNode {
    const { children, fallback, fallbackRenderer, componentName } = this.props;
    const { hasError, error, isWebGLAvailable, currentRenderer, retryCount } = this.state;

    if (hasError && error) {
      // 如果提供了自定义降级 UI，使用它
      if (fallback) {
        return fallback;
      }

      const errorType = detectErrorType(error);
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="flex items-center justify-center min-h-[400px] bg-gray-900 text-white p-6">
          <div className="max-w-2xl w-full bg-gray-800 rounded-lg shadow-xl p-6">
            {/* 错误图标 */}
            <div className="flex items-center mb-4">
              <svg
                className="w-12 h-12 text-red-500 mr-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h2 className="text-2xl font-bold">Rendering Error</h2>
                {componentName && (
                  <p className="text-gray-400 text-sm mt-1">Error in {componentName}</p>
                )}
              </div>
            </div>

            {/* 错误信息 */}
            <div className="mb-6">
              {errorType === 'webgl' && (
                <div className="bg-red-900 bg-opacity-20 border border-red-600 rounded p-4 mb-4">
                  <p className="text-red-400 font-semibold mb-2">WebGL Error Detected</p>
                  <p className="text-gray-300 text-sm">
                    {isWebGLAvailable
                      ? 'WebGL is available but encountered an error during rendering.'
                      : 'WebGL is not available in your browser. This is required for 3D visualization.'}
                  </p>
                </div>
              )}

              {errorType === 'memory' && (
                <div className="bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded p-4 mb-4">
                  <p className="text-yellow-400 font-semibold mb-2">Memory Error</p>
                  <p className="text-gray-300 text-sm">
                    The renderer ran out of memory. Try closing other applications or refreshing the page.
                  </p>
                </div>
              )}

              <p className="text-gray-300 mb-2">
                An error occurred while rendering the 3D visualization. You can try the following options:
              </p>

              {isDevelopment && (
                <details className="bg-gray-900 p-4 rounded mt-4" open>
                  <summary className="cursor-pointer text-yellow-400 font-semibold mb-2">
                    Error Details (Development Mode)
                  </summary>
                  <div className="mt-2 text-sm font-mono">
                    <p className="text-red-400 mb-2">
                      <strong>Error:</strong> {error.toString()}
                    </p>
                    {error.stack && (
                      <div className="mb-4">
                        <p className="text-yellow-400 mb-1">
                          <strong>Stack Trace:</strong>
                        </p>
                        <pre className="text-gray-400 overflow-auto max-h-40 text-xs bg-black p-2 rounded">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>

            {/* 系统信息 */}
            <div className="mb-6 p-4 bg-gray-700 rounded">
              <p className="text-sm text-gray-300 mb-2">
                <strong>System Information:</strong>
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>WebGL Available: {isWebGLAvailable ? '✓ Yes' : '✗ No'}</li>
                <li>Current Renderer: {currentRenderer || 'Not set'}</li>
                <li>Retry Count: {retryCount}</li>
                <li>User Agent: {typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 60) + '...' : 'Unknown'}</li>
              </ul>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-3">
              {/* 重试按钮 */}
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded transition-colors"
              >
                Retry with {currentRenderer === 'webgl' ? 'WebGL' : currentRenderer}
              </button>

              {/* 降级渲染器选项 */}
              {fallbackRenderer && isWebGLAvailable && currentRenderer === 'webgl' && (
                <button
                  onClick={() => this.handleUseFallback(fallbackRenderer)}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-4 rounded transition-colors"
                >
                  Try Fallback Renderer ({fallbackRenderer.toUpperCase()})
                </button>
              )}

              {/* 刷新页面 */}
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded transition-colors"
              >
                Refresh Page
              </button>
            </div>

            {/* 帮助信息 */}
            <div className="mt-6 text-sm text-gray-400 text-center border-t border-gray-700 pt-4">
              <p className="mb-2">If the problem persists, try:</p>
              <ul className="text-left list-disc list-inside space-y-1">
                <li>Updating your graphics drivers</li>
                <li>Enabling hardware acceleration in your browser</li>
                <li>Using a different browser (Chrome, Firefox, Edge)</li>
                <li>Clearing your browser cache</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    // 正常渲染子组件
    return children;
  }
}

export default CanvasErrorBoundary;
