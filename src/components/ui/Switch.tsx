'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * macOS 风格开关组件
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: SwitchProps) {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <motion.div
          className={`
            w-12 h-7 rounded-full transition-colors
            ${checked ? 'bg-blue-500' : 'bg-white/20'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          animate={{ backgroundColor: checked ? '#3B82F6' : 'rgba(255, 255, 255, 0.2)' }}
        >
          <motion.div
            className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md"
            animate={{ x: checked ? 20 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </motion.div>
      </div>
      {label && (
        <span className="ml-3 text-sm font-medium text-white/90">{label}</span>
      )}
    </label>
  );
}
