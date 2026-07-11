import { getRenderAPI } from '@/lib/mod-manager/api/RenderAPI';

export interface FrameSceneManagerLike {
  render(): void;
  getScene(): unknown;
}

export interface FrameLabelRendererLike {
  render(scene: unknown, camera: unknown): void;
}

/**
 * 驱动单帧 Three.js 叠加层渲染。
 *
 * 这个流程与场景模式无关：只要动画循环仍在推进，
 * 就应继续触发 MOD 的 pre-render 回调和 Three.js 渲染。
 */
export function executeThreeOverlayFrame(params: {
  sceneManager: FrameSceneManagerLike;
  camera: unknown;
  labelRenderer?: FrameLabelRendererLike | null;
}): void {
  const { sceneManager, camera, labelRenderer } = params;

  getRenderAPI()._executeBeforeRender();
  sceneManager.render();
  labelRenderer?.render(sceneManager.getScene(), camera);
}
