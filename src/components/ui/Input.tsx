'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * macOS 风格输入框组件
 */
export function Input({
  label,
  error,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white/70 mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-2 
          bg-white/10 backdrop-blur-md
          border border-white/20 rounded-lg
          text-white placeholder-white/40
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all smooth-transition
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
