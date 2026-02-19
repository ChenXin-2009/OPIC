/**
 * SearchErrorBoundary.tsx - 搜索组件错误边界
 * 
 * 功能：
 * - 捕获搜索组件中的错误
 * - 显示明日方舟风格的错误 UI
 * - 提供重试选项
 * - 支持中英文错误消息
 * - 记录错误到控制台
 * 
 * 需求：10.1, 10.3
 */

'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { logError } from '@/lib/utils/errors';

// ==================== 接口定义 ====================

/**
 * SearchErrorBoundary 组件属性
 */
export interface SearchErrorBoundaryProps {
  /** 子组件 */
  children: ReactNode;
  /** 语言设置 */
  lang?: 'zh' | 'en';
  /** 错误回调（可选） */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * SearchErrorBoundary 组件状态
 */
interface SearchErrorBoundaryState {
  /** 是否捕获到错误 */
  hasError: boolean;
  /** 捕获的错误对象 */
  error: Error | null;
  /** React 错误信息 */
  errorInfo: ErrorInfo | null;
}

// ==================== 错误消息 ====================

/**
 * 错误消息文本（中英文）
 */
const ERROR_MESSAGES = {
  zh: {
    title: '搜索功能出错',
    message: '搜索组件遇到了一个错误。请尝试重新加载或刷新页面。',
    retryButton: '重试',
    detailsTitle: '错误详情',
    stackTitle: '组件堆栈',
  },
  en: {
    title: 'Search Error',
    message: 'The search component encountered an error. Please try reloading or refresh the page.',
    retryButton: 'Retry',
    detailsTitle: 'Error Details',
    stackTitle: 'Component Stack',
  },
};

// ==================== SearchErrorBoundary 组件 ====================

/**
 * SearchErrorBoundary - 搜索组件错误边界
 * 
 * 使用 React Error Boundary 模式捕获搜索组件中的错误，
 * 显示明日方舟风格的错误 UI，并提供重试选项。
 * 
 * @example
 * ```tsx
 * <SearchErrorBoundary lang="zh">
 *   <CelestialSearch />
 * </SearchErrorBoundary>
 * ```
 */
export class SearchErrorBoundary extends Component<
  SearchErrorBoundaryProps,
  SearchErrorBoundaryState
> {
  constructor(props: SearchErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * 静态方法：当渲染过程中抛出错误时调用
   * 更新状态以触发错误 UI 渲染
   * 
   * @param error - 抛出的错误
   * @returns 新的状态对象
   */
  static getDerivedStateFromError(error: Error): Partial<SearchErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * 生命周期方法：捕获错误后调用
   * 记录错误信息并调用可选的错误回调
   * 
   * @param error - 抛出的错误
   * @param errorInfo - 额外的错误信息（组件堆栈）
   */
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 更新状态以包含错误信息
    this.setState({ errorInfo });

    // 记录错误到控制台
    console.error('搜索组件错误:', error);
    console.error('组件堆栈:', errorInfo.componentStack);

    // 使用统一的错误日志工具
    logError(error, {
      boundaryId: 'search-error-boundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      component: 'CelestialSearch',
    });

    // 调用可选的错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * 重置错误状态，允许重试
   * 可从错误 UI 中调用以尝试重新渲染
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  override render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, lang = 'zh' } = this.props;

    // 如果捕获到错误，显示错误 UI
    if (hasError && error) {
      return (
        <SearchErrorFallback
          error={error}
          errorInfo={errorInfo}
          onRetry={this.resetError}
          lang={lang}
        />
      );
    }

    // 没有错误，正常渲染子组件
    return children;
  }
}

// ==================== SearchErrorFallback 组件 ====================

/**
 * SearchErrorFallback 组件属性
 */
interface SearchErrorFallbackProps {
  /** 捕获的错误 */
  error: Error;
  /** 错误信息 */
  errorInfo: ErrorInfo | null;
  /** 重试回调 */
  onRetry: () => void;
  /** 语言设置 */
  lang: 'zh' | 'en';
}

/**
 * SearchErrorFallback - 搜索错误回退 UI
 * 
 * 显示明日方舟风格的错误消息和重试按钮
 * 
 * @param props - 组件属性
 * @returns 错误 UI 元素
 */
function SearchErrorFallback({
  error,
  errorInfo,
  onRetry,
  lang,
}: SearchErrorFallbackProps): ReactNode {
  const messages = ERROR_MESSAGES[lang];
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div
      style={{
        position: 'absolute',
        top: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '42rem',
        padding: '0 1rem',
        zIndex: 100,
      }}
    >
      {/* 明日方舟风格错误容器 */}
      <div
        style={{
          background: '#0a0a0a',
          border: '2px solid #ef4444',
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          padding: '1.5rem',
          position: 'relative',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
        }}
      >
        {/* 左上角装饰 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '12px',
            height: '12px',
            borderTop: '2px solid #ef4444',
            borderLeft: '2px solid #ef4444',
          }}
        />

        {/* 右下角装饰 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '12px',
            height: '12px',
            borderBottom: '2px solid #ef4444',
            borderRight: '2px solid #ef4444',
          }}
        />

        {/* 错误图标和标题 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              fontSize: '2rem',
              lineHeight: 1,
            }}
          >
            ⚠️
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#ef4444',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {messages.title}
          </h3>
        </div>

        {/* 错误消息 */}
        <p
          style={{
            margin: '0 0 1.5rem 0',
            color: '#e0e0e0',
            fontSize: '0.95rem',
            lineHeight: 1.6,
          }}
        >
          {messages.message}
        </p>

        {/* 重试按钮 */}
        <button
          onClick={onRetry}
          style={{
            padding: '0.625rem 1.5rem',
            background: '#ef4444',
            color: '#ffffff',
            border: '1px solid #ffffff',
            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#dc2626';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ef4444';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {messages.retryButton}
        </button>

        {/* 开发模式：显示错误详情 */}
        {isDevelopment && (
          <div style={{ marginTop: '1.5rem' }}>
            {/* 错误详情 */}
            <details style={{ marginBottom: '1rem' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: '#f0f0f0',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {messages.detailsTitle}
              </summary>
              <pre
                style={{
                  padding: '1rem',
                  background: '#1a1a1a',
                  border: '1px solid #333333',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '0.75rem',
                  color: '#e0e0e0',
                  lineHeight: 1.5,
                  maxHeight: '200px',
                }}
              >
                {error.toString()}
                {'\n\n'}
                {error.stack}
              </pre>
            </details>

            {/* 组件堆栈 */}
            {errorInfo?.componentStack && (
              <details>
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    color: '#f0f0f0',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {messages.stackTitle}
                </summary>
                <pre
                  style={{
                    padding: '1rem',
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '0.75rem',
                    color: '#e0e0e0',
                    lineHeight: 1.5,
                    maxHeight: '200px',
                  }}
                >
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 默认导出 ====================

export default SearchErrorBoundary;
