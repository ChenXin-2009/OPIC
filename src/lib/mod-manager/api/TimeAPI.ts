/**
 * @module mod-manager/api/TimeAPI
 * @description 时间API实现
 * 
 * 提供MOD对时间系统的访问和控制。
 */

import type { TimeAPI as ITimeAPI } from '../types';
import { TIME_SPEED_BOUNDS } from '../types';
import { getEventBus } from '../core/EventBus';

/**
 * 时间API实现类
 */
export class TimeAPIImpl implements ITimeAPI {
  private eventBus = getEventBus();
  private timeListeners: Set<(time: Date) => void> = new Set();

  // 内部状态（实际应用中从SolarSystemStore获取）
  private _currentTime: Date = new Date();
  private _isPlaying: boolean = true;
  private _timeSpeed: number = 1; // 天/秒
  private _playDirection: 'forward' | 'backward' = 'forward';

  /**
   * 获取当前时间
   */
  get currentTime(): Date {
    return new Date(this._currentTime);
  }

  /**
   * 获取播放状态
   */
  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /**
   * 获取时间速度（天/秒）
   */
  get timeSpeed(): number {
    return this._timeSpeed;
  }

  /**
   * 获取播放方向
   */
  get playDirection(): 'forward' | 'backward' {
    return this._playDirection;
  }

  /**
   * 设置当前时间
   */
  setCurrentTime(date: Date): void {
    this._currentTime = new Date(date);
    this.notifyTimeChange();
  }

  /**
   * 切换播放/暂停
   */
  togglePlayPause(): void {
    this._isPlaying = !this._isPlaying;
    this.eventBus.emit('time:play-state-change', {
      isPlaying: this._isPlaying,
    });
  }

  /**
   * 设置时间速度
   */
  setTimeSpeed(speed: number): void {
    // 边界限制
    const clampedSpeed = Math.max(
      TIME_SPEED_BOUNDS.MIN,
      Math.min(TIME_SPEED_BOUNDS.MAX, speed)
    );
    this._timeSpeed = clampedSpeed;
    this.eventBus.emit('time:speed-change', { speed: clampedSpeed });
  }

  /**
   * 设置播放方向
   */
  setPlayDirection(direction: 'forward' | 'backward'): void {
    this._playDirection = direction;
    this.eventBus.emit('time:direction-change', { direction });
  }

  /**
   * 订阅时间变化
   */
  onTimeChange(callback: (time: Date) => void): () => void {
    this.timeListeners.add(callback);
    return () => this.timeListeners.delete(callback);
  }

  /**
   * 通知时间变化
   */
  private notifyTimeChange(): void {
    const time = this.currentTime;
    this.timeListeners.forEach(cb => {
      try {
        cb(time);
      } catch {
        // 忽略回调错误
      }
    });
    this.eventBus.emit('time:change', { time });
  }

  /**
   * 内部方法：更新时间（由主应用调用）
   */
  _updateTime(time: Date): void {
    this._currentTime = new Date(time);
    this.notifyTimeChange();
  }

  /**
   * 内部方法：设置播放状态（由主应用调用）
   */
  _setPlaying(playing: boolean): void {
    this._isPlaying = playing;
  }
}

// 单例实例
let timeApiInstance: TimeAPIImpl | null = null;

/**
 * 获取时间API单例
 */
export function getTimeAPI(): TimeAPIImpl {
  if (!timeApiInstance) {
    timeApiInstance = new TimeAPIImpl();
  }
  return timeApiInstance;
}

/**
 * 重置时间API（仅用于测试）
 */
export function resetTimeAPI(): void {
  timeApiInstance = null;
}