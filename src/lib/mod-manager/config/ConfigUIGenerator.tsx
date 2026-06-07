/**
 * @module mod-manager/config/ConfigUIGenerator
 * @description 配置 UI 自动生成器
 * 
 * 根据 JSON Schema 自动生成 macOS 风格的配置表单
 */

'use client';

import { useState, useCallback } from 'react';
import type { JSONSchema } from './types';
import { ConfigValidator } from './ConfigValidator';

/**
 * 配置 UI 生成器属性
 */
export interface ConfigUIGeneratorProps {
  /** JSON Schema */
  schema: JSONSchema;
  /** 当前配置值 */
  value: Record<string, unknown>;
  /** 值变化回调 */
  onChange: (value: Record<string, unknown>) => void;
  /** 是否只读 */
  readOnly?: boolean;
  /** 语言 */
  lang?: 'zh' | 'en';
}

/**
 * 字段 UI 生成器属性
 */
interface FieldUIProps {
  /** 字段名 */
  name: string;
  /** 字段 Schema */
  schema: JSONSchema;
  /** 字段值 */
  value: unknown;
  /** 值变化回调 */
  onChange: (value: unknown) => void;
  /** 是否只读 */
  readOnly?: boolean;
  /** 验证错误 */
  error?: string;
  /** 语言 */
  lang: 'zh' | 'en';
}

/**
 * 字符串输入组件
 */
function StringInput({ name, schema, value, onChange, readOnly, error, lang }: FieldUIProps) {
  const stringValue = typeof value === 'string' ? value : '';
  const label = (lang === 'zh' && schema.titleZh) || schema.title || name;
  const description = (lang === 'zh' && schema.descriptionZh) || schema.description;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white/90 mb-2">
        {label}
        {schema.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-white/60 mb-2">{description}</p>
      )}
      <input
        type="text"
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={schema.default as string}
        className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-white/20 focus:ring-blue-500'
        } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}

/**
 * 数字输入组件
 */
function NumberInput({ name, schema, value, onChange, readOnly, error, lang }: FieldUIProps) {
  const numberValue = typeof value === 'number' ? value : (schema.default as number) || 0;
  const label = (lang === 'zh' && schema.titleZh) || schema.title || name;
  const description = (lang === 'zh' && schema.descriptionZh) || schema.description;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white/90 mb-2">
        {label}
        {schema.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-white/60 mb-2">{description}</p>
      )}
      <input
        type="number"
        value={numberValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        readOnly={readOnly}
        min={schema.minimum}
        max={schema.maximum}
        className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-white/20 focus:ring-blue-500'
        } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {(schema.minimum !== undefined || schema.maximum !== undefined) && (
        <p className="text-xs text-white/40 mt-1">
          {lang === 'zh' ? '范围' : 'Range'}: {schema.minimum ?? '-∞'} ~ {schema.maximum ?? '+∞'}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}

/**
 * 布尔值开关组件
 */
function BooleanSwitch({ name, schema, value, onChange, readOnly, error, lang }: FieldUIProps) {
  const boolValue = typeof value === 'boolean' ? value : (schema.default as boolean) || false;
  const label = (lang === 'zh' && schema.titleZh) || schema.title || name;
  const description = (lang === 'zh' && schema.descriptionZh) || schema.description;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label className="block text-sm font-medium text-white/90">
            {label}
            {schema.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {description && (
            <p className="text-xs text-white/60 mt-1">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => !readOnly && onChange(!boolValue)}
          disabled={readOnly}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            boolValue ? 'bg-blue-500' : 'bg-white/20'
          } ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              boolValue ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}

/**
 * 枚举选择组件
 */
function EnumSelect({ name, schema, value, onChange, readOnly, error, lang }: FieldUIProps) {
  const label = (lang === 'zh' && schema.titleZh) || schema.title || name;
  const description = (lang === 'zh' && schema.descriptionZh) || schema.description;
  const enumValues = schema.enum || [];

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white/90 mb-2">
        {label}
        {schema.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-white/60 mb-2">{description}</p>
      )}
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-white/20 focus:ring-blue-500'
        } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {enumValues.map((enumValue) => (
          <option key={String(enumValue)} value={String(enumValue)}>
            {String(enumValue)}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}

/**
 * 对象编辑器组件
 */
function ObjectEditor({ name, schema, value, onChange, readOnly, error, lang }: FieldUIProps) {
  const objectValue = (value && typeof value === 'object' && !Array.isArray(value))
    ? value as Record<string, unknown>
    : {};
  const label = (lang === 'zh' && schema.titleZh) || schema.title || name;
  const description = (lang === 'zh' && schema.descriptionZh) || schema.description;

  const handleFieldChange = useCallback((fieldName: string, fieldValue: unknown) => {
    onChange({
      ...objectValue,
      [fieldName]: fieldValue,
    });
  }, [objectValue, onChange]);

  if (!schema.properties) {
    return null;
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white/90 mb-2">
        {label}
        {schema.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-white/60 mb-2">{description}</p>
      )}
      <div className="pl-4 border-l-2 border-white/10">
        {Object.entries(schema.properties).map(([fieldName, fieldSchema]) => (
          <FieldUI
            key={fieldName}
            name={fieldName}
            schema={fieldSchema}
            value={objectValue[fieldName]}
            onChange={(v) => handleFieldChange(fieldName, v)}
            readOnly={readOnly}
            lang={lang}
          />
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}

/**
 * 数组编辑器组件
 */
function ArrayEditor({ name, schema, value, onChange, readOnly, error, lang }: FieldUIProps) {
  const arrayValue = Array.isArray(value) ? value : [];
  const label = (lang === 'zh' && schema.titleZh) || schema.title || name;
  const description = (lang === 'zh' && schema.descriptionZh) || schema.description;

  const handleAdd = useCallback(() => {
    const newItem = schema.items?.default ?? null;
    onChange([...arrayValue, newItem]);
  }, [arrayValue, onChange, schema.items]);

  const handleRemove = useCallback((index: number) => {
    onChange(arrayValue.filter((_, i) => i !== index));
  }, [arrayValue, onChange]);

  const handleItemChange = useCallback((index: number, itemValue: unknown) => {
    const newArray = [...arrayValue];
    newArray[index] = itemValue;
    onChange(newArray);
  }, [arrayValue, onChange]);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white/90 mb-2">
        {label}
        {schema.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-white/60 mb-2">{description}</p>
      )}
      <div className="space-y-2">
        {arrayValue.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1">
              {schema.items && (
                <FieldUI
                  name={`${name}[${index}]`}
                  schema={schema.items}
                  value={item}
                  onChange={(v) => handleItemChange(index, v)}
                  readOnly={readOnly}
                  lang={lang}
                />
              )}
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm"
              >
                {lang === 'zh' ? '删除' : 'Remove'}
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button
            type="button"
            onClick={handleAdd}
            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm"
          >
            + {lang === 'zh' ? '添加项' : 'Add Item'}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}

/**
 * 字段 UI 组件（根据类型选择合适的输入组件）
 */
function FieldUI(props: FieldUIProps) {
  const { schema } = props;

  // 枚举类型
  if (schema.enum && schema.enum.length > 0) {
    return <EnumSelect {...props} />;
  }

  // 根据类型选择组件
  switch (schema.type) {
    case 'string':
      return <StringInput {...props} />;
    case 'number':
      return <NumberInput {...props} />;
    case 'boolean':
      return <BooleanSwitch {...props} />;
    case 'object':
      return <ObjectEditor {...props} />;
    case 'array':
      return <ArrayEditor {...props} />;
    default:
      return null;
  }
}

/**
 * 配置 UI 生成器组件
 */
export function ConfigUIGenerator({
  schema,
  value,
  onChange,
  readOnly = false,
  lang = 'zh',
}: ConfigUIGeneratorProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 实时验证
  const handleChange = useCallback((newValue: Record<string, unknown>) => {
    onChange(newValue);

    // 验证新值
    const result = ConfigValidator.validate(newValue, schema);
    
    if (!result.valid) {
      const errorMap: Record<string, string> = {};
      result.errors.forEach(error => {
        errorMap[error.path] = error.message;
      });
      setErrors(errorMap);
    } else {
      setErrors({});
    }
  }, [schema, onChange]);

  if (!schema.properties) {
    return (
      <div className="text-white/60 text-center py-8">
        {lang === 'zh' ? '无可配置项' : 'No configurable fields'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(schema.properties).map(([fieldName, fieldSchema]) => (
        <FieldUI
          key={fieldName}
          name={fieldName}
          schema={fieldSchema}
          value={value[fieldName]}
          onChange={(v) => handleChange({ ...value, [fieldName]: v })}
          readOnly={readOnly}
          error={errors[fieldName]}
          lang={lang}
        />
      ))}
    </div>
  );
}
