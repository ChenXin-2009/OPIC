/**
 * MOD Manifest 格式化器
 * 
 * 将 MOD manifest 对象格式化为 JSON 字符串
 * 
 * @example
 * ```typescript
 * const manifest: ModManifest = {
 *   id: 'example-mod',
 *   name: 'Example Mod',
 *   version: '1.0.0',
 *   author: 'Author Name',
 *   description: 'A sample mod',
 *   dependencies: {},
 *   permissions: [],
 *   entry: './index.js'
 * };
 * 
 * const formatted = formatModManifest(manifest);
 * // {
 * //   "id": "example-mod",
 * //   "name": "Example Mod",
 * //   ...
 * // }
 * ```
 */

/**
 * MOD Manifest 接口
 */
export interface ModManifest {
  /** MOD 唯一标识符 */
  id: string;
  
  /** MOD 显示名称 */
  name: string;
  
  /** 版本号（遵循 SemVer） */
  version: string;
  
  /** 作者信息 */
  author: string;
  
  /** 描述信息 */
  description: string;
  
  /** 依赖项（MOD ID -> 版本范围） */
  dependencies?: Record<string, string>;
  
  /** 需要的权限列表 */
  permissions?: string[];
  
  /** 入口文件路径 */
  entry: string;
  
  /** 可选的图标路径 */
  icon?: string;
  
  /** 可选的主页 URL */
  homepage?: string;
  
  /** 可选的仓库 URL */
  repository?: string;
  
  /** 可选的许可证 */
  license?: string;
}

/**
 * 格式化错误类
 */
export class ModManifestFormatterError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'ModManifestFormatterError';
  }
}

/**
 * 格式化 MOD manifest 为 JSON 字符串
 * 
 * @param manifest - MOD manifest 对象
 * @param pretty - 是否格式化输出（带缩进）
 * @returns 格式化的 JSON 字符串
 * @throws ModManifestFormatterError 如果数据无效
 */
export function formatModManifest(manifest: ModManifest, pretty: boolean = true): string {
  try {
    // 验证必需字段
    if (!manifest.id || typeof manifest.id !== 'string') {
      throw new ModManifestFormatterError('Missing or invalid id field', 'id', manifest.id);
    }

    if (!manifest.name || typeof manifest.name !== 'string') {
      throw new ModManifestFormatterError('Missing or invalid name field', 'name', manifest.name);
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      throw new ModManifestFormatterError('Missing or invalid version field', 'version', manifest.version);
    }

    if (!manifest.author || typeof manifest.author !== 'string') {
      throw new ModManifestFormatterError('Missing or invalid author field', 'author', manifest.author);
    }

    if (!manifest.description || typeof manifest.description !== 'string') {
      throw new ModManifestFormatterError('Missing or invalid description field', 'description', manifest.description);
    }

    if (!manifest.entry || typeof manifest.entry !== 'string') {
      throw new ModManifestFormatterError('Missing or invalid entry field', 'entry', manifest.entry);
    }

    // 验证版本号格式（简单的 SemVer 验证）
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    if (!semverRegex.test(manifest.version)) {
      throw new ModManifestFormatterError(
        'Invalid version format: must follow SemVer (e.g., 1.0.0)',
        'version',
        manifest.version
      );
    }

    // 验证 ID 格式（kebab-case）
    const idRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!idRegex.test(manifest.id)) {
      throw new ModManifestFormatterError(
        'Invalid id format: must be kebab-case (e.g., example-mod)',
        'id',
        manifest.id
      );
    }

    // 创建格式化对象（确保字段顺序）
    const formatted: Partial<ModManifest> = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      author: manifest.author,
      description: manifest.description,
    };

    // 添加可选字段
    if (manifest.icon) {
      formatted.icon = manifest.icon;
    }

    if (manifest.homepage) {
      formatted.homepage = manifest.homepage;
    }

    if (manifest.repository) {
      formatted.repository = manifest.repository;
    }

    if (manifest.license) {
      formatted.license = manifest.license;
    }

    if (manifest.dependencies && Object.keys(manifest.dependencies).length > 0) {
      formatted.dependencies = manifest.dependencies;
    }

    if (manifest.permissions && manifest.permissions.length > 0) {
      formatted.permissions = manifest.permissions;
    }

    formatted.entry = manifest.entry;

    // 格式化为 JSON
    return pretty 
      ? JSON.stringify(formatted, null, 2) 
      : JSON.stringify(formatted);
  } catch (error) {
    if (error instanceof ModManifestFormatterError) {
      throw error;
    }
    throw new ModManifestFormatterError(
      `Failed to format MOD manifest: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 验证格式化后的 MOD manifest JSON 字符串
 * 
 * @param formatted - 格式化的 JSON 字符串
 * @returns 是否有效
 */
export function validateFormattedModManifest(formatted: string): boolean {
  try {
    const parsed = JSON.parse(formatted);
    
    // 检查必需字段
    if (!parsed.id || typeof parsed.id !== 'string') return false;
    if (!parsed.name || typeof parsed.name !== 'string') return false;
    if (!parsed.version || typeof parsed.version !== 'string') return false;
    if (!parsed.author || typeof parsed.author !== 'string') return false;
    if (!parsed.description || typeof parsed.description !== 'string') return false;
    if (!parsed.entry || typeof parsed.entry !== 'string') return false;

    return true;
  } catch {
    return false;
  }
}
