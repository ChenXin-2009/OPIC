/**
 * Scene Store - 管理 3D 场景相关的全局状态
 *
 * 存储 SceneManager 和 CameraController 实例，供其他组件使用。
 * 作为 3D 渲染核心的单一事实来源，避免在组件间传递回调。
 */

import { create } from 'zustand';
import type { SceneManager } from '@/lib/3d/SceneManager';
import type { CameraController } from '@/lib/3d/CameraController';

/**
 * Scene Store 的状态与操作接口
 */
interface SceneState {
  /** SceneManager 实例（负责场景图、渲染循环） */
  sceneManager: SceneManager | null;
  /** CameraController 实例（负责相机轨道控制） */
  cameraController: CameraController | null;
  /**
   * 设置 SceneManager 实例
   * @param sceneManager - SceneManager 实例
   */
  setSceneManager: (sceneManager: SceneManager) => void;
  /**
   * 设置 CameraController 实例
   * @param cameraController - CameraController 实例
   */
  setCameraController: (cameraController: CameraController) => void;
}

/** Scene 全局状态 Store */
export const useSceneStore = create<SceneState>((set) => ({
  sceneManager: null,
  cameraController: null,
  setSceneManager: (sceneManager) => set({ sceneManager }),
  setCameraController: (cameraController) => set({ cameraController }),
}));
