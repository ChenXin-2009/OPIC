/**
 * TimeController - 时间控制器
 * 
 * 负责管理日期选择、验证和图层切换
 */

import { LayerManager, LayerConfig } from "./layer-manager";

/**
 * 时间过渡配置接口
 */
export interface TimeTransitionConfig {
  mode: "fade" | "replace";
  duration?: number;
  preloadAdjacent?: boolean;
}

/**
 * 日期常量
 */
export const DATE_CONSTANTS = {
  MIN_DATE: new Date("2000-02-24"),
  
  getMaxDate: (): Date => {
    const now = new Date();
    // 改为 -8 天,确保 GIBS 数据已完全处理完成
    now.setDate(now.getDate() - 8);
    return now;
  },
  
  getDefaultDate: (): Date => {
    return DATE_CONSTANTS.getMaxDate();
  },
};

/**
 * TimeController 类
 */
export class TimeController {
  private layerManager: LayerManager;
  private currentDate: Date | null = null;

  constructor(layerManager: LayerManager) {
    this.layerManager = layerManager;
    this.currentDate = DATE_CONSTANTS.getDefaultDate();
  }

  /**
   * 设置日期
   */
  async setDate(
    date: Date,
    config?: TimeTransitionConfig
  ): Promise<void> {
    // 验证日期范围
    const validatedDate = this.validateDateRange(date);

    const mode = config?.mode || "replace";

    if (mode === "replace") {
      // 替换模式：移除旧图层，添加新图层
      const activeLayer = this.layerManager.getActiveLayer();
      if (activeLayer) {
        this.layerManager.removeLayer(activeLayer);
      }

      await this.layerManager.addLayer({
        layerName: "MODIS_TERRA_TRUE_COLOR",
        date: validatedDate,
      });
    } else {
      // fade 模式：预加载新图层，使用透明度渐变
      const newLayer = await this.layerManager.addLayer({
        layerName: "MODIS_TERRA_TRUE_COLOR",
        date: validatedDate,
        alpha: 0,
      });

      // 渐变动画
      const duration = config?.duration || 1000;
      const steps = 20;
      const stepDuration = duration / steps;
      const alphaStep = 1 / steps;

      for (let i = 0; i <= steps; i++) {
        await new Promise((resolve) => setTimeout(resolve, stepDuration));
        this.layerManager.setLayerAlpha(newLayer, i * alphaStep);
      }

      // 移除旧图层
      const layers = this.layerManager.getLayers();
      if (layers.length > 1) {
        this.layerManager.removeLayer(layers[0]);
      }
    }

    this.currentDate = validatedDate;
  }

  /**
   * 获取当前日期
   */
  getCurrentDate(): Date | null {
    return this.currentDate;
  }

  /**
   * 检查日期是否可用
   */
  async isDateAvailable(date: Date): Promise<boolean> {
    return date >= DATE_CONSTANTS.MIN_DATE && date <= DATE_CONSTANTS.getMaxDate();
  }

  /**
   * 获取最近可用日期
   */
  async getClosestAvailableDate(date: Date): Promise<Date> {
    if (date < DATE_CONSTANTS.MIN_DATE) {
      return DATE_CONSTANTS.MIN_DATE;
    }
    if (date > DATE_CONSTANTS.getMaxDate()) {
      return DATE_CONSTANTS.getMaxDate();
    }
    return date;
  }

  /**
   * 获取最小日期
   */
  getMinDate(): Date {
    return DATE_CONSTANTS.MIN_DATE;
  }

  /**
   * 获取最大日期
   */
  getMaxDate(): Date {
    return DATE_CONSTANTS.getMaxDate();
  }

  /**
   * 预加载日期
   */
  async preloadDate(date: Date): Promise<void> {
    // 预加载但不显示
    await this.layerManager.addLayer({
      layerName: "MODIS_TERRA_TRUE_COLOR",
      date,
      show: false,
    });
  }

  /**
   * 验证日期范围
   */
  private validateDateRange(date: Date): Date {
    if (date < DATE_CONSTANTS.MIN_DATE) {
      return DATE_CONSTANTS.MIN_DATE;
    }
    if (date > DATE_CONSTANTS.getMaxDate()) {
      return DATE_CONSTANTS.getMaxDate();
    }
    return date;
  }
}
