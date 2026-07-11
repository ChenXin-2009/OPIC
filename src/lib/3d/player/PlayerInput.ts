/**
 * 自由飞行模式键盘输入处理器 (Player Input Handler)
 *
 * 处理 WASD 自由飞行模式下的键盘输入，将按键状态转换为飞行控制信号。
 *
 * 支持的输入：
 * - W/S: 前进/后退（thrust）
 * - A/D: 左右平移（strafe）
 * - Q/E: 上升/下降（lift）
 * - 方向键: 偏航（yaw）和俯仰（pitch）
 * - Shift: 加速（boost）
 *
 * 特性：
 * - 自动忽略输入框/文本区域的按键事件
 * - 支持启用/禁用切换
 * - 基于 Set 的按键状态跟踪，无重复触发
 */

/** 自由飞行模式的输入状态 */
export interface PlayerInputState {
  thrust: number;
  strafe: number;
  lift: number;
  yaw: number;
  pitch: number;
  roll: number;
  boost: boolean;
  stage: boolean;
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

/**
 * 键盘输入处理器 — 将 WASD 按键状态转换为飞行控制信号。
 */
export class PlayerInput {
  private enabled = false;
  private keys = new Set<string>();
  private onKeyDown: (event: KeyboardEvent) => void;
  private onKeyUp: (event: KeyboardEvent) => void;
  private onBlur: () => void;

  constructor() {
    this.onKeyDown = (event: KeyboardEvent) => {
      if (!this.enabled) return;
      if (isTextInputTarget(event.target)) return;
      this.keys.add(event.code);
      if (
        event.code === 'ArrowUp' ||
        event.code === 'ArrowDown' ||
        event.code === 'ArrowLeft' ||
        event.code === 'ArrowRight' ||
        event.code === 'Space'
      ) {
        event.preventDefault();
      }
    };

    this.onKeyUp = (event: KeyboardEvent) => {
      if (!this.enabled) return;
      this.keys.delete(event.code);
    };

    this.onBlur = () => {
      this.keys.clear();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      window.addEventListener('blur', this.onBlur);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.keys.clear();
    }
  }

  getState(): PlayerInputState {
    if (!this.enabled) {
      return {
        thrust: 0,
        strafe: 0,
        lift: 0,
        yaw: 0,
        pitch: 0,
        roll: 0,
        boost: false,
        stage: false,
      };
    }

    const thrust = (this.keys.has('KeyW') ? 1 : 0) + (this.keys.has('KeyS') ? -1 : 0);
    const strafe = (this.keys.has('KeyD') ? 1 : 0) + (this.keys.has('KeyA') ? -1 : 0);
    const lift = (this.keys.has('KeyR') ? 1 : 0) + (this.keys.has('KeyF') ? -1 : 0);
    const yaw = (this.keys.has('ArrowRight') ? 1 : 0) + (this.keys.has('ArrowLeft') ? -1 : 0);
    const pitch = (this.keys.has('ArrowUp') ? 1 : 0) + (this.keys.has('ArrowDown') ? -1 : 0);
    const roll = (this.keys.has('KeyE') ? 1 : 0) + (this.keys.has('KeyQ') ? -1 : 0);
    const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const stage = this.keys.has('Space');

    return { thrust, strafe, lift, yaw, pitch, roll, boost, stage };
  }

  dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      window.removeEventListener('blur', this.onBlur);
    }
    this.keys.clear();
  }
}
