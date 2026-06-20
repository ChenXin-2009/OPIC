/**
 * MOD 自动发现和动态加载
 */

import type { ModManifest, ModLifecycleHooks } from '../types';
import type { ModLoadOptions, ModPackageFile, DownloadProgress } from './types';
import { registerMod } from '../init';
import { getPackageValidator } from './PackageValidator';
import { getVersionChecker } from './VersionChecker';

export class ModDiscovery {
  private loadedMods = new Set<string>();
  private downloadProgressCallbacks = new Map<string, (progress: DownloadProgress) => void>();

  /**
   * 从动态导入加载 MOD（本地路径）
   */
  async loadModFromPath(modPath: string): Promise<void> {
    try {
      const module = await import(`@/lib/mods/${modPath}`);
      
      // 查找 MOD 导出函数 (格式: get*Mod)
      const getModFn = Object.keys(module).find(key => 
        key.startsWith('get') && key.endsWith('Mod') && typeof module[key] === 'function'
      );

      if (!getModFn) {
        throw new Error(`MOD ${modPath} 没有找到 get*Mod 导出函数`);
      }

      const modExport = module[getModFn]();

      if (!modExport.manifest) {
        throw new Error(`MOD ${modPath} 缺少 manifest`);
      }

      registerMod(modExport.manifest, modExport.hooks);
      this.loadedMods.add(modExport.manifest.id);
      
      console.log(`[ModDiscovery] 已加载 MOD: ${modExport.manifest.id}`);
    } catch (error) {
      console.error(`[ModDiscovery] 加载 MOD 失败: ${modPath}`, error);
      throw error;
    }
  }

  /**
   * 从配置加载所有 MOD
   */
  async loadModsFromConfig(config: string[]): Promise<void> {
    const loadResults: { path: string; success: boolean; error?: string }[] = [];
    
    for (const modPath of config) {
      if (!this.loadedMods.has(modPath)) {
        try {
          await this.loadModFromPath(modPath);
          loadResults.push({ path: modPath, success: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          loadResults.push({ path: modPath, success: false, error: errorMessage });
          console.warn(`[ModDiscovery] 跳过无法加载的MOD: ${modPath}`, errorMessage);
        }
      }
    }
    
    // 报告加载结果
    const successCount = loadResults.filter(r => r.success).length;
    const failCount = loadResults.filter(r => !r.success).length;
    
    console.log(`[ModDiscovery] MOD加载完成: ${successCount}个成功, ${failCount}个失败`);
    
    if (failCount > 0) {
      const failedMods = loadResults.filter(r => !r.success);
      console.warn('[ModDiscovery] 失败的MOD列表:', failedMods);
    }
  }

  /**
   * 验证MOD路径是否存在
   */
  async validateModPath(modPath: string): Promise<boolean> {
    try {
      // 尝试动态导入来检查模块是否存在
      await import(`@/lib/mods/${modPath}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证配置中的所有MOD路径
   * @returns 有效的MOD路径列表
   */
  async validateModsConfig(config: string[]): Promise<{
    valid: string[];
    invalid: string[];
  }> {
    const valid: string[] = [];
    const invalid: string[] = [];
    
    for (const modPath of config) {
      const isValid = await this.validateModPath(modPath);
      if (isValid) {
        valid.push(modPath);
      } else {
        invalid.push(modPath);
      }
    }
    
    if (invalid.length > 0) {
      console.warn(
        `[ModDiscovery] 检测到 ${invalid.length} 个无效的MOD配置:\n` +
        invalid.map(p => `  - ${p} (文件不存在或无法加载)`).join('\n') +
        '\n建议从 mods.config.json 中移除这些条目'
      );
    }
    
    return { valid, invalid };
  }

  /**
   * 自动发现MOD目录中的所有MOD
   * 扫描指定目录，查找所有包含有效MOD结构的子文件夹
   * 
   * @returns 发现的MOD路径列表
   */
  async discoverMods(): Promise<string[]> {
    const discoveredMods: string[] = [];
    
    // 定义要扫描的MOD目录列表
    // 这些是相对于 @/lib/mods/ 的路径
    const potentialModNames = [
      'satellite-tracking',
      'cesium-integration',
      'weather-disaster',
      'global-traffic',
      'space-launches',
      // 可以添加更多已知的MOD名称
    ];

    console.log('[ModDiscovery] 开始自动发现MOD...');

    // 尝试加载每个潜在的MOD
    for (const modName of potentialModNames) {
      try {
        // 尝试动态导入来检查MOD是否存在
        const module = await import(`@/lib/mods/${modName}`);
        
        // 检查是否有有效的MOD导出
        const getModFn = Object.keys(module).find(key => 
          key.startsWith('get') && key.endsWith('Mod') && typeof module[key] === 'function'
        );

        if (getModFn) {
          const modExport = module[getModFn]();
          if (modExport.manifest) {
            discoveredMods.push(modName);
            console.log(`[ModDiscovery] 发现MOD: ${modName} (${modExport.manifest.name})`);
          }
        }
      } catch (error) {
        // 静默跳过不存在或无效的MOD
        // 这是正常的，因为我们在探测可能的MOD
      }
    }

    console.log(`[ModDiscovery] 自动发现完成，找到 ${discoveredMods.length} 个MOD`);
    return discoveredMods;
  }

  /**
   * 使用Webpack的require.context自动发现MOD（仅在构建时可用）
   * 这个方法会扫描mods目录下的所有子文件夹
   * 
   * @returns 发现的MOD路径列表
   */
  async discoverModsWithContext(): Promise<string[]> {
    const discoveredMods: string[] = [];
    
    try {
      // 使用动态require.context来发现所有MOD
      // 这需要Webpack在构建时处理
      // @ts-expect-error - require.context是Webpack特性
      if (typeof require !== 'undefined' && require.context) {
        // @ts-expect-error - require.context是Webpack特性
        const modsContext = require.context('@/lib/mods', true, /^\.\/[^/]+\/index\.ts$/);
        
        modsContext.keys().forEach((key: string) => {
          // 从路径中提取MOD名称
          // 例如: "./satellite-tracking/index.ts" -> "satellite-tracking"
          const match = key.match(/^\.\/([^/]+)\/index\.ts$/);
          if (match) {
            discoveredMods.push(match[1]);
          }
        });
        
        console.log(`[ModDiscovery] 通过require.context发现 ${discoveredMods.length} 个MOD`);
      }
    } catch (error) {
      console.warn('[ModDiscovery] require.context不可用，回退到手动发现');
    }
    
    return discoveredMods;
  }

  /**
   * 卸载指定的MOD
   */
  unloadMod(modId: string): void {
    if (this.loadedMods.has(modId)) {
      this.loadedMods.delete(modId);
      console.log(`[ModDiscovery] 已卸载 MOD: ${modId}`);
    }
  }

  /**
   * 从URL加载MOD包
   */
  async loadModFromUrl(
    url: string,
    options: ModLoadOptions = {}
  ): Promise<void> {
    const {
      verifySignature = false,
      checkVersion = true,
      checkDependencies = true,
      maxPackageSize = 10 * 1024 * 1024, // 10MB
      timeout = 30000, // 30秒
    } = options;

    try {
      console.log(`[ModDiscovery] 开始从URL加载MOD: ${url}`);

      // 1. 下载MOD包
      const packageData = await this.downloadPackage(url, maxPackageSize, timeout);
      console.log(`[ModDiscovery] 包下载完成，大小: ${packageData.byteLength} 字节`);

      // 2. 解压包（假设是ZIP格式）
      const { packageInfo, manifest, code } = await this.extractPackage(packageData);
      console.log(`[ModDiscovery] 包解压完成: ${packageInfo.id}`);

      // 3. 验证包
      const validator = getPackageValidator();
      const validation = validator.validatePackage(packageInfo, manifest, packageData);
      
      if (!validation.valid) {
        throw new Error(`包验证失败:\n${validation.errors.join('\n')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn(`[ModDiscovery] 包验证警告:\n${validation.warnings.join('\n')}`);
      }

      // 4. 验证签名（如果启用）
      if (verifySignature && packageInfo.signature) {
        const signatureValid = await validator.verifySignature(
          packageData,
          packageInfo.signature,
          '' // TODO: 需要公钥管理系统
        );
        if (!signatureValid) {
          throw new Error('数字签名验证失败');
        }
        console.log(`[ModDiscovery] 签名验证通过`);
      }

      // 5. 检查版本兼容性
      if (checkVersion) {
    const versionChecker = getVersionChecker();
        const compatibility = versionChecker.checkCompatibility(packageInfo.apiVersion);
        
        if (!compatibility.compatible) {
          throw new Error(`版本不兼容: ${compatibility.reason}`);
        }

        if (compatibility.warnings.length > 0) {
          console.warn(`[ModDiscovery] 版本兼容性警告:\n${compatibility.warnings.join('\n')}`);
        }
        console.log(`[ModDiscovery] 版本兼容性检查通过`);
      }

      // 6. 检查依赖
      if (checkDependencies && packageInfo.dependencies) {
        await this.checkDependencies(packageInfo.dependencies);
        console.log(`[ModDiscovery] 依赖检查通过`);
      }

      // 7. 在沙箱中加载代码
      const modExport = await this.loadCodeInSandbox(code, packageInfo.id);

      // 8. 注册MOD
      registerMod(modExport.manifest, modExport.hooks);
      this.loadedMods.add(modExport.manifest.id);
      
      console.log(`[ModDiscovery] MOD加载成功: ${modExport.manifest.id}`);
    } catch (error) {
      console.error(`[ModDiscovery] 从URL加载MOD失败: ${url}`, error);
      throw error;
    }
  }

  /**
   * 下载MOD包
   */
  private async downloadPackage(
    url: string,
    maxSize: number,
    timeout: number
  ): Promise<ArrayBuffer> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > maxSize) {
        throw new Error(`包大小超过限制: ${contentLength} > ${maxSize}`);
      }

      // 读取响应体并报告进度
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应体');
      }

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;
      const totalLength = contentLength ? parseInt(contentLength, 10) : 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // 检查大小限制
        if (receivedLength > maxSize) {
          throw new Error(`包大小超过限制: ${receivedLength} > ${maxSize}`);
        }

        // 报告进度
        if (totalLength > 0) {
          const progress: DownloadProgress = {
            loaded: receivedLength,
            total: totalLength,
            percentage: Math.round((receivedLength / totalLength) * 100),
          };
          this.notifyDownloadProgress(url, progress);
        }
      }

      // 合并所有块
      const allChunks = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      return allChunks.buffer;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 解压MOD包
   */
  private async extractPackage(_packageData: ArrayBuffer): Promise<{
    packageInfo: ModPackageFile;
    manifest: ModManifest;
    code: string;
  }> {
    // TODO: 实现真实的ZIP解压
    // 需要使用 JSZip 或类似的库
    // 示例实现：
    // const zip = await JSZip.loadAsync(packageData);
    // const packageInfoFile = await zip.file('package.json')?.async('string');
    // const manifestFile = await zip.file('manifest.json')?.async('string');
    // const codeFile = await zip.file('index.js')?.async('string');
    
    throw new Error('ZIP解压功能尚未实现。请使用 loadModFromPath 加载本地MOD。');
  }

  /**
   * 检查依赖是否满足
   */
  private async checkDependencies(dependencies: Record<string, string>): Promise<void> {
    const missingDeps: string[] = [];
    const incompatibleDeps: string[] = [];

    for (const [depId, depVersionRange] of Object.entries(dependencies)) {
      // 检查依赖是否已加载
      if (!this.loadedMods.has(depId)) {
        missingDeps.push(`${depId}@${depVersionRange}`);
        continue;
      }

      // TODO: 检查已加载依赖的版本是否满足范围
      // 需要从已加载的MOD中获取版本信息
      // const loadedVersion = getLoadedModVersion(depId);
      // if (!versionChecker.checkVersionRange(loadedVersion, depVersionRange)) {
      //   incompatibleDeps.push(`${depId}: 需要 ${depVersionRange}, 已加载 ${loadedVersion}`);
      // }
    }

    if (missingDeps.length > 0) {
      throw new Error(`缺少依赖: ${missingDeps.join(', ')}`);
    }

    if (incompatibleDeps.length > 0) {
      throw new Error(`依赖版本不兼容:\n${incompatibleDeps.join('\n')}`);
    }
  }

  /**
   * 在沙箱中加载代码
   */
  private async loadCodeInSandbox(_code: string, _modId: string): Promise<{
    manifest: ModManifest;
    hooks?: ModLifecycleHooks;
  }> {
    // TODO: 实现真实的沙箱加载
    // 需要使用 iframe 或 Web Worker 来隔离代码执行
    // 示例实现：
    // const sandbox = new Function('exports', 'require', code);
    // const exports = {};
    // sandbox(exports, ...);
    // return exports;
    
    throw new Error('沙箱代码加载功能尚未实现。请使用 loadModFromPath 加载本地MOD。');
  }

  /**
   * 注册下载进度回调
   */
  onDownloadProgress(url: string, callback: (progress: DownloadProgress) => void): void {
    this.downloadProgressCallbacks.set(url, callback);
  }

  /**
   * 通知下载进度
   */
  private notifyDownloadProgress(url: string, progress: DownloadProgress): void {
    const callback = this.downloadProgressCallbacks.get(url);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * 获取已加载的 MOD 列表
   */
  getLoadedMods(): string[] {
    return Array.from(this.loadedMods);
  }
}

// 单例
let discoveryInstance: ModDiscovery | null = null;

export function getModDiscovery(): ModDiscovery {
  if (!discoveryInstance) {
    discoveryInstance = new ModDiscovery();
  }
  return discoveryInstance;
}
