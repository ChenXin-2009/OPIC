import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { SceneMode, SceneModeManager } from '@/lib/3d/SceneModeManager';
import { getRenderAPI, resetRenderAPI } from '@/lib/mod-manager/api/RenderAPI';
import { executeThreeOverlayFrame } from '../renderFramePipeline';

describe('renderFramePipeline', () => {
  beforeEach(() => {
    resetRenderAPI();
  });

  afterEach(() => {
    resetRenderAPI();
  });

  it('should keep executing Three pre-render callbacks in CESIUM_DOMINANT mode', () => {
    const renderApi = getRenderAPI();
    const modeManager = new SceneModeManager();
    const renderCalls: string[] = [];

    const sceneManager = {
      render: () => {
        renderCalls.push('scene');
      },
      getScene: () => ({ id: 'mock-scene' }),
      getSceneModeManager: () => modeManager,
    };

    const labelRenderer = {
      render: () => {
        renderCalls.push('labels');
      },
    };

    let beforeRenderCount = 0;
    renderApi.onBeforeRender(() => {
      beforeRenderCount += 1;
    });

    modeManager.switchMode(SceneMode.CESIUM_DOMINANT);
    expect(modeManager.getCurrentMode()).toBe(SceneMode.CESIUM_DOMINANT);

    for (let i = 0; i < 5; i += 1) {
      executeThreeOverlayFrame({
        sceneManager,
        camera: { id: 'mock-camera' },
        labelRenderer,
      });
    }

    expect(beforeRenderCount).toBe(5);
    expect(renderCalls.filter(call => call === 'scene')).toHaveLength(5);
    expect(renderCalls.filter(call => call === 'labels')).toHaveLength(5);
    expect(modeManager.getCurrentMode()).toBe(SceneMode.CESIUM_DOMINANT);
  });
});
