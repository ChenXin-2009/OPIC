/**
 * 客户端API验证器
 * 负责验证客户端JavaScript API的可用性、单例模式、方法和类型定义
 */

import { ClientAPIHealth } from '../models/health-models';

/**
 * 客户端API配置
 */
interface ClientAPIConfig {
  /** API名称 */
  name: string;
  /** API模块路径 */
  modulePath: string;
  /** 必需的方法列表 */
  requiredMethods: string[];
}

/**
 * 客户端API验证器类
 */
export class ClientAPIValidator {
  private readonly clientAPIs: ClientAPIConfig[] = [
    {
      name: 'TimeAPI',
      modulePath: '@/lib/api/TimeAPI',
      requiredMethods: ['getCurrentTime', 'setTimeScale', 'pause', 'resume'],
    },
    {
      name: 'CameraAPI',
      modulePath: '@/lib/api/CameraAPI',
      requiredMethods: ['setPosition', 'lookAt', 'getPosition', 'getDirection'],
    },
    {
      name: 'CelestialAPI',
      modulePath: '@/lib/api/CelestialAPI',
      requiredMethods: ['getCelestialBody', 'getAllBodies', 'getPosition'],
    },
    {
      name: 'SatelliteAPI',
      modulePath: '@/lib/api/SatelliteAPI',
      requiredMethods: ['getSatellite', 'getAllSatellites', 'updateTLE'],
    },
    {
      name: 'RenderAPI',
      modulePath: '@/lib/api/RenderAPI',
      requiredMethods: ['setQuality', 'toggleLayer', 'screenshot'],
    },
  ];

  /**
   * 验证所有客户端API
   */
  public async validateAllAPIs(): Promise<ClientAPIHealth[]> {
    const results: ClientAPIHealth[] = [];

    for (const apiConfig of this.clientAPIs) {
      const result = await this.validateAPI(apiConfig);
      results.push(result);
    }

    return results;
  }

  /**
   * 验证单个客户端API
   */
  private async validateAPI(config: ClientAPIConfig): Promise<ClientAPIHealth> {
    const timestamp = new Date();

    try {
      // 11.1 验证API导出和可访问性
      const apiModule = await this.loadAPIModule(config.modulePath);
      
      if (!apiModule) {
        return {
          name: config.name,
          available: false,
          isSingleton: false,
          missingMethods: config.requiredMethods,
          hasTypeDefinitions: false,
          error: 'API模块无法加载',
          timestamp,
        };
      }

      // 11.2 验证单例模式
      const isSingleton = this.validateSingletonPattern(apiModule);

      // 11.3 验证API方法
      const missingMethods = this.validateAPIMethods(apiModule, config.requiredMethods);

      // 11.4 验证类型定义
      const hasTypeDefinitions = this.validateTypeDefinitions(config.modulePath);

      return {
        name: config.name,
        available: true,
        isSingleton,
        missingMethods,
        hasTypeDefinitions,
        timestamp,
      };
    } catch (error) {
      return {
        name: config.name,
        available: false,
        isSingleton: false,
        missingMethods: config.requiredMethods,
        hasTypeDefinitions: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp,
      };
    }
  }

  /**
   * 加载API模块
   */
  private async loadAPIModule(modulePath: string): Promise<any> {
    try {
      // 在Node.js环境中，尝试动态导入
      // 注意：这在实际运行时可能需要根据项目结构调整
      const module = await import(modulePath);
      return module.default || module;
    } catch (error) {
      // 如果无法动态导入，返回null
      return null;
    }
  }

  /**
   * 验证单例模式
   * 检查API是否实现了单例模式（通常通过getInstance方法或直接导出实例）
   */
  private validateSingletonPattern(apiModule: any): boolean {
    // 检查是否有getInstance静态方法
    if (typeof apiModule.getInstance === 'function') {
      return true;
    }

    // 检查是否直接导出了实例（对象而非类）
    if (typeof apiModule === 'object' && apiModule !== null && !apiModule.prototype) {
      return true;
    }

    // 检查是否有instance属性
    if (apiModule.instance !== undefined) {
      return true;
    }

    return false;
  }

  /**
   * 验证API方法
   * 检查所有必需的方法是否存在
   */
  private validateAPIMethods(apiModule: any, requiredMethods: string[]): string[] {
    const missingMethods: string[] = [];

    for (const method of requiredMethods) {
      // 检查方法是否存在
      const hasMethod = typeof apiModule[method] === 'function' ||
                       (apiModule.prototype && typeof apiModule.prototype[method] === 'function');

      if (!hasMethod) {
        missingMethods.push(method);
      }
    }

    return missingMethods;
  }

  /**
   * 验证类型定义
   * 检查是否存在对应的TypeScript类型定义文件
   */
  private validateTypeDefinitions(modulePath: string): boolean {
    try {
      const fs = require('fs');
      const path = require('path');

      // 将模块路径转换为文件系统路径
      const filePath = modulePath.replace('@/', 'src/');
      
      // 检查.ts文件是否存在
      const tsPath = path.join(process.cwd(), `${filePath}.ts`);
      if (fs.existsSync(tsPath)) {
        // 读取文件内容，检查是否包含类型定义
        const content = fs.readFileSync(tsPath, 'utf-8');
        return content.includes('interface') || 
               content.includes('type ') || 
               content.includes('export class');
      }

      // 检查.d.ts文件是否存在
      const dtsPath = path.join(process.cwd(), `${filePath}.d.ts`);
      return fs.existsSync(dtsPath);
    } catch (error) {
      // 如果检查失败，返回false
      return false;
    }
  }

  /**
   * 获取客户端API配置列表
   */
  public getClientAPIConfigs(): ClientAPIConfig[] {
    return this.clientAPIs;
  }
}
