/**
 * SearchBox.tsx - 天体搜索输入框（明日方舟风格）
 * 
 * 功能：
 * - 搜索输入框，支持中英文输入
 * - 搜索图标和清除按钮
 * - 聚焦视觉反馈（边框高亮）
 * - 明日方舟风格设计（黑色背景、白色边框、菱形切角）
 * 
 * 需求：1.1, 1.4, 1.5, 1.6, 9.1
 */

'use client';

import { useRef, useEffect, memo } from 'react';

// ==================== 明日方舟风格配置 ====================
const ARKNIGHTS_COLORS = {
  primary: '#ffffff',      // 白色主色
  secondary: '#e0e0e0',    // 浅灰
  accent: '#f0f0f0',       // 亮白
  dark: '#0a0a0a',         // 纯黑背景
  darkLight: '#1a1a1a',    // 深灰
  border: '#333333',       // 边框灰
  text: '#ffffff',         // 白色文字
  textDim: '#999999',      // 暗淡文字
};

// ==================== 接口定义 ====================

/**
 * SearchBox 组件属性
 */
export interface SearchBoxProps {
  /** 当前输入值 */
  value: string;
  /** 输入变化回调 */
  onChange: (value: string) => void;
  /** 获得焦点回调 */
  onFocus: () => void;
  /** 失去焦点回调 */
  onBlur: () => void;
  /** 清除按钮点击回调 */
  onClear: () => void;
  /** 占位符文本 */
  placeholder: string;
  /** 是否处于聚焦状态 */
  isFocused: boolean;
}

// ==================== SearchBox 组件 ====================

/**
 * SearchBox - 天体搜索输入框
 * 
 * 采用明日方舟风格设计：
 * - 黑色背景 (#0a0a0a)
 * - 白色边框 (#333333)
 * - 聚焦时白色高光边框 (#ffffff)
 * - 菱形切角（clip-path）
 * - 左上角和右下角装饰元素
 * - 搜索图标和清除按钮
 * 
 * 无障碍支持：
 * - aria-label 标签
 * - role="search" 语义化
 * - 键盘导航支持
 */
const SearchBox = memo(function SearchBox({
  value,
  onChange,
  onFocus,
  onBlur,
  onClear,
  placeholder,
  isFocused,
}: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // 处理清除按钮点击
  const handleClear = () => {
    onClear();
    // 清除后重新聚焦输入框
    inputRef.current?.focus();
  };

  // 当 isFocused 为 true 时，聚焦输入框
  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  return (
    <div
      role="search"
      className="relative w-full max-w-2xl mx-auto"
      style={{
        background: ARKNIGHTS_COLORS.dark,
        border: `2px solid ${isFocused ? ARKNIGHTS_COLORS.primary : ARKNIGHTS_COLORS.border}`,
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        transition: 'all 0.2s ease',
        boxShadow: isFocused ? `0 0 20px ${ARKNIGHTS_COLORS.primary}40` : 'none',
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
          background: isFocused ? ARKNIGHTS_COLORS.primary : ARKNIGHTS_COLORS.border,
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
          transition: 'background 0.2s ease',
        }}
        aria-hidden="true"
      />

      {/* 右下角装饰 */}
      <div
        className="absolute"
        style={{
          bottom: '-1px',
          right: '-1px',
          width: '12px',
          height: '12px',
          background: isFocused ? ARKNIGHTS_COLORS.primary : ARKNIGHTS_COLORS.border,
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
          transition: 'background 0.2s ease',
        }}
        aria-hidden="true"
      />

      {/* 搜索框内容容器 */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* 搜索图标 */}
        <svg
          className="flex-shrink-0"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isFocused ? ARKNIGHTS_COLORS.primary : ARKNIGHTS_COLORS.textDim}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke 0.2s ease' }}
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        {/* 输入框 */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-label={placeholder}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{
            color: ARKNIGHTS_COLORS.text,
            caretColor: ARKNIGHTS_COLORS.primary,
          }}
        />

        {/* 清除按钮 */}
        {value && (
          <button
            onClick={handleClear}
            aria-label="清除搜索"
            className="flex-shrink-0 p-1 transition-all duration-200"
            style={{
              color: ARKNIGHTS_COLORS.textDim,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = ARKNIGHTS_COLORS.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = ARKNIGHTS_COLORS.textDim;
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* 占位符样式 */}
      <style jsx>{`
        input::placeholder {
          color: ${ARKNIGHTS_COLORS.textDim};
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
});

export default SearchBox;
