import type { ModLifecycleHooks, ModContext } from '@/lib/mod-manager/types';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { useSolarSystemStore } from '@/lib/state';
import { useSceneStore } from '@/lib/state/SceneStore';
import { gravityGridManifest } from './manifest';
import { GravityGridRenderer } from './GravityGridRenderer';
import { DEFAULT_GRID_CONFIG, type GridConfig, type GizmoMode } from './GravityFieldCalculator';

export const gravityGridHooks: ModLifecycleHooks = {
  onLoad: async (context: ModContext) => {
    context.logger.info('[Gravity Grid] MOD 加载中...');
    context.setState({ config: { ...DEFAULT_GRID_CONFIG } });
  },

  onEnable: async (context: ModContext) => {
    context.logger.info('[Gravity Grid] MOD 启用');

    const state = context.getState() as { config?: GridConfig };
    const config = state.config || DEFAULT_GRID_CONFIG;
    const renderer = new GravityGridRenderer(config);

    let scene: THREE.Scene;
    let camera: THREE.Camera;
    let transformControls: TransformControls | null = null;

    try {
      scene = context.render.getScene() as THREE.Scene;
      camera = context.render.getCamera() as THREE.Camera;
      scene.add(renderer.getGroup());

      // Set up TransformControls
      const threeRenderer = context.render.getRenderer() as THREE.WebGLRenderer;
      transformControls = new TransformControls(camera, threeRenderer.domElement);
      transformControls.setSize(0.8);
      transformControls.setSpace('world');
      scene.add(transformControls.getHelper());

      transformControls.addEventListener('dragging-changed', (event: { value: unknown }) => {
        const isDragging = event.value as boolean;
        renderer.setGizmoActive(isDragging);
        const cc = useSceneStore.getState().cameraController;
        if (cc) cc.getControls().enabled = !isDragging;
      });

      transformControls.addEventListener('objectChange', () => {
        renderer.readGizmoTransform();
      });

      renderer.setTransformControls(transformControls);
      renderer.setGizmoMode(config.gizmoMode);
    } catch (e) {
      context.logger.warn('[Gravity Grid] 无法获取场景或相机');
      return;
    }

    const unsubscribeRender = context.render.onBeforeRender(() => {
      try {
        const bodies = useSolarSystemStore.getState().celestialBodies;
        const cam = context.render.getCamera() as THREE.Camera;
        if (bodies.length > 0 && cam) {
          renderer.update(bodies, cam);
        }
      } catch {
        // skip frame on transient errors
      }
    });

    const unsubscribeEvent = context.on('gravity-grid:update', (data: unknown) => {
      const newConfig = data as GridConfig;

      if (renderer.getGizmoMode() !== newConfig.gizmoMode && transformControls) {
        renderer.setGizmoMode(newConfig.gizmoMode);
      }

      renderer.updateConfig(newConfig);
      context.setState({ config: newConfig });
    });

    context.setState({
      renderer,
      transformControls,
      unsubscribeRender,
      unsubscribeEvent,
    });
    context.logger.info('[Gravity Grid] 渲染器已挂载');
  },

  onDisable: async (context: ModContext) => {
    context.logger.info('[Gravity Grid] MOD 禁用');

    const state = context.getState() as {
      renderer?: GravityGridRenderer;
      transformControls?: TransformControls;
      unsubscribeRender?: () => void;
      unsubscribeEvent?: () => void;
    };

    if (state.unsubscribeRender) state.unsubscribeRender();
    if (state.unsubscribeEvent) state.unsubscribeEvent();

    try {
      const scene = context.render.getScene() as THREE.Scene;

      if (state.transformControls) {
        scene.remove(state.transformControls.getHelper());
      }

      if (state.renderer) {
        scene.remove(state.renderer.getGroup());
        state.renderer.dispose();
      }
    } catch { /* ignore */ }
  },

  onUnload: async (context: ModContext) => {
    context.logger.info('[Gravity Grid] MOD 卸载');
  },

  onError: (error: Error, context: ModContext) => {
    context.logger.error('[Gravity Grid] 错误:', error);
  },

  handleToggle: (context: ModContext) => {
    context.logger.info('[Gravity Grid] 切换引力切面网格显示');
    context.emit('mod:open-window', {
      modId: 'gravity-grid',
      windowId: 'gravity-grid-window',
      title: 'Gravity Grid Controller',
      titleZh: '引力切面控制器',
    });
  },
};

export function getGravityGridMod() {
  return {
    manifest: gravityGridManifest,
    hooks: gravityGridHooks,
  };
}

export { gravityGridManifest } from './manifest';
export { GravityGridRenderer } from './GravityGridRenderer';
export { DEFAULT_GRID_CONFIG, ALL_BODY_IDS } from './GravityFieldCalculator';
export type { GridConfig } from './GravityFieldCalculator';
