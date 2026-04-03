/**
 * @module comment-coverage.test
 * @description 注释覆盖率属性测试
 *
 * 使用 TypeScript 编译器 API 解析 AST，结合 fast-check 属性测试框架，
 * 验证 15 个目标文件的注释覆盖率满足以下属性：
 *   - 属性 1：所有目标文件均有完整模块注释（文件顶部有 JSDoc 块）
 *   - 属性 2：所有公开 API（export 的函数、类、接口、常量）均有 JSDoc 注释
 *   - 属性 6：注释内容包含中文字符（Unicode 范围 \u4e00-\u9fff）
 *
 * **验证：需求 9.1、9.2**
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import * as fc from 'fast-check';

// ─── 目标文件列表 ────────────────────────────────────────────────────────────

/** 15 个目标文件的相对路径（相对于项目根目录）。
 *  注意：CameraDebugPanel.tsx 不存在，已从列表中排除。
 */
const TARGET_FILES: string[] = [
  'src/lib/cesium/CameraSynchronizer.ts',
  'src/lib/cesium/CoordinateTransformer.ts',
  'src/lib/3d/CameraController.ts',
  'src/lib/cesium/CesiumAdapter.ts',
  'src/lib/cesium/CesiumEarthExtension.ts',
  'src/lib/cesium/imageryProviders.ts',
  'src/lib/3d/SolarSystemGrid.ts',
  'src/lib/config/cameraConfig.ts',
  'src/components/CesiumToggleButton.tsx',
  'src/components/EarthLightButton.tsx',
  'src/components/EarthLockButton.tsx',
  'src/components/cesium/CesiumMapSourcePanel.tsx',
  'src/components/satellite/SatelliteMenu.tsx',
  'src/components/debug/CesiumDebugPanel.tsx',
  'src/components/debug/ClippingTestPanel.tsx',
];

// ─── 项目根目录 ──────────────────────────────────────────────────────────────

/** 项目根目录（相对于本测试文件向上三级） */
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// ─── AST 辅助函数 ────────────────────────────────────────────────────────────

/**
 * 读取并解析目标文件，返回 TypeScript SourceFile AST。
 * @param relPath 相对于项目根目录的文件路径
 * @returns TypeScript SourceFile 节点
 */
function parseFile(relPath: string): ts.SourceFile {
  const absPath = path.join(PROJECT_ROOT, relPath);
  const source = fs.readFileSync(absPath, 'utf-8');
  const ext = relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(absPath, source, ts.ScriptTarget.Latest, true, ext);
}

/**
 * 获取节点的原始文本（从 SourceFile 中截取）。
 * @param node AST 节点
 * @param sourceFile 所属 SourceFile
 * @returns 节点对应的源码文本
 */
function getNodeText(node: ts.Node, sourceFile: ts.SourceFile): string {
  return sourceFile.text.slice(node.getFullStart(), node.getEnd());
}

/**
 * 判断给定文本是否包含中文字符（Unicode CJK 统一汉字范围）。
 * @param text 待检测文本
 * @returns 是否包含中文字符
 */
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * 判断节点前是否存在 JSDoc 注释块（/** ... *\/）。
 * 通过检查节点的 leading trivia（前置空白/注释）实现。
 * @param node AST 节点
 * @param sourceFile 所属 SourceFile
 * @returns 是否有 JSDoc 注释
 */
function hasJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  const fullText = sourceFile.text;
  const nodeStart = node.getFullStart();
  const nodePos = node.getStart(sourceFile);
  const trivia = fullText.slice(nodeStart, nodePos);
  return /\/\*\*[\s\S]*?\*\//.test(trivia);
}

/**
 * 获取 SourceFile 顶部的第一个 JSDoc 注释块文本。
 * 扫描文件开头的 trivia，找到第一个 /** ... *\/ 块。
 * @param sourceFile 已解析的 SourceFile
 * @returns JSDoc 注释文本，若不存在则返回 null
 */
function getModuleComment(sourceFile: ts.SourceFile): string | null {
  const text = sourceFile.text;
  // 跳过 BOM 和空白，找到第一个注释
  const match = text.match(/^[\s\uFEFF]*?(\/\*\*[\s\S]*?\*\/)/);
  if (match) return match[1];
  return null;
}

/**
 * 判断模块注释是否包含至少三个必要字段（模块名称、功能描述、架构层级、主要依赖）。
 * 通过关键词匹配实现宽松检测，支持多种注释风格。
 * @param commentText JSDoc 注释文本
 * @returns 是否包含至少三个必要字段
 */
function hasRequiredModuleFields(commentText: string): boolean {
  // 提取注释正文（去掉 /** 和 */ 以及每行开头的 * ）
  const body = commentText
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .replace(/^\s*\*\s?/gm, '')
    .trim();

  // 检查第一行是否有实质性内容（作为模块名称/标题）
  const firstLine = body.split('\n')[0].trim();
  const hasTitle = firstLine.length > 2;

  const fields = [
    // 模块名称：@module 标签、中文"模块名称"字样、或注释第一行有实质内容（标题）
    hasTitle || /@module\b|模块名称/i.test(commentText),
    // 功能描述：@description 标签 或 中文描述性内容（职责、功能、描述、负责）
    /@description\b|功能描述|描述|职责|负责|功能/i.test(commentText),
    // 架构层级：architecture 关键词 或 中文"架构"字样
    /@architecture\b|架构层级|架构/i.test(commentText),
    // 主要依赖：@dependencies 标签 或 中文"依赖"字样 或 "使用方式"（说明了集成关系）
    /@dependencies\b|主要依赖|依赖|依赖关系|使用方式|集成/i.test(commentText),
  ];
  const matchCount = fields.filter(Boolean).length;
  return matchCount >= 3;
}

/**
 * 收集 SourceFile 中所有公开 API 节点：
 * - export 的函数声明、类声明、接口声明、变量声明、类型别名
 * - 类中的 public 方法和构造函数
 * @param sourceFile 已解析的 SourceFile
 * @returns 公开 API 节点数组
 */
function getPublicApis(sourceFile: ts.SourceFile): ts.Node[] {
  const results: ts.Node[] = [];

  function visit(node: ts.Node): void {
    // 顶层 export 声明
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isVariableStatement(node) ||
      ts.isEnumDeclaration(node)
    ) {
      const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
      const isExported = modifiers?.some(
        m => m.kind === ts.SyntaxKind.ExportKeyword
      );
      if (isExported) {
        results.push(node);
      }
    }

    // 类成员：public 方法和构造函数
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      node.members.forEach(member => {
        if (ts.isConstructorDeclaration(member)) {
          results.push(member);
        } else if (
          ts.isMethodDeclaration(member) ||
          ts.isPropertyDeclaration(member)
        ) {
          const modifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined;
          const isPrivate = modifiers?.some(
            m => m.kind === ts.SyntaxKind.PrivateKeyword
          );
          const isProtected = modifiers?.some(
            m => m.kind === ts.SyntaxKind.ProtectedKeyword
          );
          // 无访问修饰符默认为 public，或显式 public
          if (!isPrivate && !isProtected) {
            results.push(member);
          }
        }
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

/**
 * 收集 SourceFile 中所有注释文本（行注释和块注释）。
 * @param sourceFile 已解析的 SourceFile
 * @returns 注释文本数组
 */
function getAllComments(sourceFile: ts.SourceFile): string[] {
  const text = sourceFile.text;
  const comments: string[] = [];

  // 匹配所有块注释和行注释
  const commentRegex = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
  let match: RegExpExecArray | null;
  while ((match = commentRegex.exec(text)) !== null) {
    comments.push(match[0]);
  }
  return comments;
}

// ─── 属性测试 ────────────────────────────────────────────────────────────────

describe('注释覆盖率属性测试', () => {

  /**
   * 属性 1：所有目标文件均有完整模块注释
   *
   * 对于 15 个目标文件中的任意一个，其文件顶部应存在 JSDoc 注释块（/** ... *\/），
   * 且该注释块应包含模块名称、功能描述、架构层级和主要依赖四个字段中的至少三个。
   *
   * **验证：需求 1.1、1.2、1.3**
   */
  test('属性 1：所有目标文件均有完整模块注释', () => {
    fc.assert(
      fc.property(fc.constantFrom(...TARGET_FILES), (filePath) => {
        const sourceFile = parseFile(filePath);
        const moduleComment = getModuleComment(sourceFile);

        // 必须存在模块注释
        if (moduleComment === null) {
          console.error(`[属性 1 失败] ${filePath}: 文件顶部缺少 JSDoc 注释块`);
          return false;
        }

        // 必须包含至少三个必要字段
        const hasFields = hasRequiredModuleFields(moduleComment);
        if (!hasFields) {
          console.error(`[属性 1 失败] ${filePath}: 模块注释缺少必要字段（需要至少三个：模块名称、功能描述、架构层级、主要依赖）`);
          console.error(`  注释内容：${moduleComment.slice(0, 200)}...`);
        }
        return hasFields;
      }),
      { numRuns: TARGET_FILES.length }
    );
  });

  /**
   * 属性 2：所有公开 API 均有 JSDoc 注释
   *
   * 对于任意目标文件中的任意 export 函数、类、接口或常量，
   * 以及任意 public 方法和构造函数，其定义前应存在 JSDoc 注释块。
   *
   * **验证：需求 2.1、2.5、9.2**
   */
  test('属性 2：所有公开 API 均有 JSDoc 注释', () => {
    fc.assert(
      fc.property(fc.constantFrom(...TARGET_FILES), (filePath) => {
        const sourceFile = parseFile(filePath);
        const publicApis = getPublicApis(sourceFile);

        const missing: string[] = [];
        for (const api of publicApis) {
          if (!hasJSDocComment(api, sourceFile)) {
            // 获取节点名称用于错误报告
            let name = '(匿名)';
            if (ts.isFunctionDeclaration(api) && api.name) {
              name = api.name.text;
            } else if (ts.isClassDeclaration(api) && api.name) {
              name = api.name.text;
            } else if (ts.isInterfaceDeclaration(api)) {
              name = api.name.text;
            } else if (ts.isTypeAliasDeclaration(api)) {
              name = api.name.text;
            } else if (ts.isVariableStatement(api)) {
              const decl = api.declarationList.declarations[0];
              if (decl && ts.isIdentifier(decl.name)) {
                name = decl.name.text;
              }
            } else if (ts.isMethodDeclaration(api) && ts.isIdentifier(api.name)) {
              name = api.name.text;
            } else if (ts.isConstructorDeclaration(api)) {
              name = 'constructor';
            } else if (ts.isEnumDeclaration(api)) {
              name = api.name.text;
            }
            const line = sourceFile.getLineAndCharacterOfPosition(api.getStart(sourceFile)).line + 1;
            missing.push(`  行 ${line}: ${name}`);
          }
        }

        if (missing.length > 0) {
          console.error(`[属性 2 失败] ${filePath}: 以下公开 API 缺少 JSDoc 注释：`);
          missing.forEach(m => console.error(m));
          return false;
        }
        return true;
      }),
      { numRuns: TARGET_FILES.length }
    );
  });

  /**
   * 属性 6：注释内容包含中文字符
   *
   * 对于任意目标文件，其注释内容（所有注释的总和）应包含中文字符
   * （Unicode 范围 \u4e00-\u9fff），以确保注释使用中文撰写。
   *
   * **验证：需求 7.1**
   */
  test('属性 6：注释内容包含中文字符', () => {
    fc.assert(
      fc.property(fc.constantFrom(...TARGET_FILES), (filePath) => {
        const sourceFile = parseFile(filePath);
        const comments = getAllComments(sourceFile);

        if (comments.length === 0) {
          console.error(`[属性 6 失败] ${filePath}: 文件中没有任何注释`);
          return false;
        }

        const allCommentText = comments.join('\n');
        const hasChinese = containsChinese(allCommentText);

        if (!hasChinese) {
          console.error(`[属性 6 失败] ${filePath}: 注释内容中未发现中文字符`);
        }
        return hasChinese;
      }),
      { numRuns: TARGET_FILES.length }
    );
  });

});

// ─── 单元测试：验证所有目标文件均存在 ────────────────────────────────────────

describe('目标文件存在性检查', () => {
  test.each(TARGET_FILES)('文件存在：%s', (filePath) => {
    const absPath = path.join(PROJECT_ROOT, filePath);
    expect(fs.existsSync(absPath)).toBe(true);
  });
});
