/**
 * @module documentation/validator
 * @description 注释验证工具
 * 
 * @architecture
 * - 所属子系统：文档系统
 * - 架构层级：服务层
 * - 职责边界：负责解析和验证 JSDoc/TSDoc 注释格式，不负责代码的 AST 分析
 * 
 * @dependencies
 * - 直接依赖：documentation/types
 * - 被依赖：documentation/coverage, test/*
 * - 循环依赖：无
 */

/**
 * JSDoc 标签信息
 * 
 * @description 表示解析后的单个 JSDoc 标签
 */
export interface JSDocTag {
  /** 标签名称（不含 @ 符号） */
  name: string;
  
  /** 标签内容 */
  content: string;
  
  /** 标签在注释中的行号 */
  lineNumber: number;
}

/**
 * 解析后的 JSDoc 注释
 * 
 * @description 表示完整解析后的 JSDoc 注释块
 */
export interface ParsedJSDoc {
  /** 主描述内容 */
  description: string;
  
  /** 所有标签列表 */
  tags: JSDocTag[];
  
  /** 原始注释文本 */
  raw: string;
}

/**
 * 注释验证结果
 * 
 * @description 表示注释验证的结果，包含错误和警告信息
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  
  /** 错误信息列表 */
  errors: string[];
  
  /** 警告信息列表 */
  warnings: string[];
}

/**
 * 解析 JSDoc 注释块
 * 
 * @description 从注释文本中提取描述和标签信息
 * 
 * @param {string} commentText - 注释文本（包含 /** 和 *\/）
 * @returns {ParsedJSDoc | null} 解析后的注释对象，如果不是有效的 JSDoc 则返回 null
 * 
 * @complexity 时间复杂度 O(n)，n 为注释文本长度
 * 
 * @example
 * ```typescript
 * const comment = `/**
 *  * @description 示例函数
 *  * @param {string} name - 名称
 *  *\/`;
 * const parsed = parseJSDoc(comment);
 * console.log(parsed?.tags.length); // 2
 * ```
 */
export function parseJSDoc(commentText: string): ParsedJSDoc | null {
  // 检查是否是有效的 JSDoc 注释
  if (!commentText.trim().startsWith('/**') || !commentText.trim().endsWith('*/')) {
    return null;
  }

  // 移除注释标记和每行开头的 *
  const lines = commentText
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, ''));

  const tags: JSDocTag[] = [];
  let description = '';
  let currentTag: JSDocTag | null = null;
  let inDescription = true;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // 检查是否是标签行
    const tagMatch = trimmedLine.match(/^@(\w+)\s*(.*)/);
    
    if (tagMatch) {
      // 保存之前的标签
      if (currentTag) {
        tags.push(currentTag);
      }
      
      // 创建新标签
      currentTag = {
        name: tagMatch[1],
        content: tagMatch[2],
        lineNumber: index + 1,
      };
      inDescription = false;
    } else if (currentTag) {
      // 继续当前标签的内容
      currentTag.content += (currentTag.content ? '\n' : '') + trimmedLine;
    } else if (inDescription && trimmedLine) {
      // 添加到描述
      description += (description ? '\n' : '') + trimmedLine;
    }
  });

  // 保存最后一个标签
  if (currentTag) {
    tags.push(currentTag);
  }

  return {
    description: description.trim(),
    tags,
    raw: commentText,
  };
}

/**
 * 标准标签顺序
 * 
 * @description 定义 JSDoc 标签的推荐顺序，用于验证标签顺序一致性
 */
const STANDARD_TAG_ORDER = [
  'module',
  'class',
  'function',
  'description',
  'architecture',
  'dependencies',
  'coordinateSystem',
  'unit',
  'precision',
  'param',
  'returns',
  'throws',
  'performance',
  'complexity',
  'renderPipeline',
  'testStrategy',
  'example',
  'see',
  'link',
  'deprecated',
];

/**
 * 验证标签顺序
 * 
 * @description 检查注释中的标签顺序是否符合规范
 * 
 * @param {JSDocTag[]} tags - 标签列表
 * @returns {boolean} 是否符合标准顺序
 * 
 * @complexity 时间复杂度 O(n)，n 为标签数量
 * 
 * @example
 * ```typescript
 * const tags = [
 *   { name: 'description', content: '...', lineNumber: 1 },
 *   { name: 'param', content: '...', lineNumber: 2 },
 * ];
 * const valid = isValidTagOrder(tags); // true
 * ```
 */
export function isValidTagOrder(tags: JSDocTag[]): boolean {
  let lastIndex = -1;
  
  for (const tag of tags) {
    const currentIndex = STANDARD_TAG_ORDER.indexOf(tag.name);
    
    // 如果标签不在标准列表中，跳过
    if (currentIndex === -1) {
      continue;
    }
    
    // 检查顺序
    if (currentIndex < lastIndex) {
      return false;
    }
    
    lastIndex = currentIndex;
  }
  
  return true;
}

/**
 * 检查文本是否主要使用中文
 * 
 * @description 检查文本中中文字符的比例，用于验证注释是否使用中文编写
 * 
 * @param {string} text - 要检查的文本
 * @param {number} threshold - 中文字符比例阈值（0-1），默认 0.3
 * @returns {boolean} 是否主要使用中文
 * 
 * @complexity 时间复杂度 O(n)，n 为文本长度
 * 
 * @example
 * ```typescript
 * const text = '这是一个示例 example';
 * const isChinese = isPrimarilyChinese(text); // true
 * ```
 */
export function isPrimarilyChinese(text: string, threshold: number = 0.3): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  // 统计中文字符数量
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  const chineseCount = chineseChars ? chineseChars.length : 0;
  
  // 统计总字符数（排除空白字符）
  const totalChars = text.replace(/\s/g, '').length;
  
  if (totalChars === 0) {
    return false;
  }
  
  // 计算中文字符比例
  const ratio = chineseCount / totalChars;
  
  return ratio >= threshold;
}

/**
 * 验证模块注释完整性
 * 
 * @description 检查模块级注释是否包含所有必需的标签
 * 
 * @param {ParsedJSDoc} jsdoc - 解析后的 JSDoc 对象
 * @returns {ValidationResult} 验证结果
 * 
 * @example
 * ```typescript
 * const parsed = parseJSDoc(commentText);
 * if (parsed) {
 *   const result = validateModuleComment(parsed);
 *   if (!result.valid) {
 *     console.error('验证失败:', result.errors);
 *   }
 * }
 * ```
 */
export function validateModuleComment(jsdoc: ParsedJSDoc): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const tagNames = jsdoc.tags.map(t => t.name);
  
  // 检查必需标签
  const requiredTags = ['module', 'description', 'architecture', 'dependencies'];
  for (const required of requiredTags) {
    if (!tagNames.includes(required)) {
      errors.push(`缺少必需标签: @${required}`);
    }
  }
  
  // 检查描述是否使用中文
  if (jsdoc.description && !isPrimarilyChinese(jsdoc.description)) {
    warnings.push('主描述应主要使用中文编写');
  }
  
  // 检查标签顺序
  if (!isValidTagOrder(jsdoc.tags)) {
    warnings.push('标签顺序不符合规范');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 验证函数注释完整性
 * 
 * @description 检查函数注释是否包含所有必需的标签
 * 
 * @param {ParsedJSDoc} jsdoc - 解析后的 JSDoc 对象
 * @param {number} paramCount - 函数参数数量
 * @returns {ValidationResult} 验证结果
 * 
 * @example
 * ```typescript
 * const parsed = parseJSDoc(functionComment);
 * if (parsed) {
 *   const result = validateFunctionComment(parsed, 2);
 *   if (!result.valid) {
 *     console.error('验证失败:', result.errors);
 *   }
 * }
 * ```
 */
export function validateFunctionComment(
  jsdoc: ParsedJSDoc,
  paramCount: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const tagNames = jsdoc.tags.map(t => t.name);
  
  // 检查必需标签
  if (!tagNames.includes('description') && !jsdoc.description) {
    errors.push('缺少函数描述');
  }
  
  // 检查参数标签数量
  const paramTags = jsdoc.tags.filter(t => t.name === 'param');
  if (paramTags.length !== paramCount) {
    errors.push(`参数标签数量不匹配: 期望 ${paramCount}，实际 ${paramTags.length}`);
  }
  
  // 检查返回值标签
  if (!tagNames.includes('returns')) {
    warnings.push('建议添加 @returns 标签说明返回值');
  }
  
  // 检查描述是否使用中文
  const description = jsdoc.description || jsdoc.tags.find(t => t.name === 'description')?.content || '';
  if (description && !isPrimarilyChinese(description)) {
    warnings.push('函数描述应主要使用中文编写');
  }
  
  // 检查标签顺序
  if (!isValidTagOrder(jsdoc.tags)) {
    warnings.push('标签顺序不符合规范');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 验证天文计算函数注释
 * 
 * @description 检查天文计算函数注释是否包含领域特定的标签
 * 
 * @param {ParsedJSDoc} jsdoc - 解析后的 JSDoc 对象
 * @returns {ValidationResult} 验证结果
 * 
 * @example
 * ```typescript
 * const parsed = parseJSDoc(astronomyFunctionComment);
 * if (parsed) {
 *   const result = validateAstronomyFunctionComment(parsed);
 *   if (!result.valid) {
 *     console.error('验证失败:', result.errors);
 *   }
 * }
 * ```
 */
export function validateAstronomyFunctionComment(jsdoc: ParsedJSDoc): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const tagNames = jsdoc.tags.map(t => t.name);
  
  // 检查天文学特定标签
  const astronomyTags = ['coordinateSystem', 'unit', 'precision'];
  for (const tag of astronomyTags) {
    if (!tagNames.includes(tag)) {
      errors.push(`天文计算函数缺少必需标签: @${tag}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 验证类型注释完整性
 * 
 * @description 检查类型定义注释是否包含必要的说明
 * 
 * @param {ParsedJSDoc} jsdoc - 解析后的 JSDoc 对象
 * @returns {ValidationResult} 验证结果
 * 
 * @example
 * ```typescript
 * const parsed = parseJSDoc(typeComment);
 * if (parsed) {
 *   const result = validateTypeComment(parsed);
 *   if (!result.valid) {
 *     console.error('验证失败:', result.errors);
 *   }
 * }
 * ```
 */
export function validateTypeComment(jsdoc: ParsedJSDoc): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 检查是否有描述
  if (!jsdoc.description && !jsdoc.tags.find(t => t.name === 'description')) {
    errors.push('类型定义缺少描述');
  }
  
  // 检查描述是否使用中文
  const description = jsdoc.description || jsdoc.tags.find(t => t.name === 'description')?.content || '';
  if (description && !isPrimarilyChinese(description)) {
    warnings.push('类型描述应主要使用中文编写');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
