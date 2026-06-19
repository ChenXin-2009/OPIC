/**
 * Scene Store - 管理 3D 场景相关的全局状态
 * 
 * 存储 SceneManager 和 CameraController 实例,供其他组件使用
 */

import { create } from 'zustand';
import type { SceneManager } from '@/lib/3d/SceneManager';
import type { CameraController } from '@/lib/3d/CameraController';

interface SceneState {
  sceneManager: SceneManager | null;
  cameraController: CameraController | null;
  setSceneManager: (sceneManager: SceneManager) => void;
  setCameraController: (cameraController: CameraController) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  sceneManager: null,
  cameraController: null,
  setSceneManager: (sceneManager) => set({ sceneManager }),
  setCameraController: (cameraController) => set({ cameraController }),
}));
