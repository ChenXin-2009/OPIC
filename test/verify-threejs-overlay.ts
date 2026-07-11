import { SceneMode, SceneModeManager } from '../src/lib/3d/SceneModeManager';
import { getRenderAPI, resetRenderAPI } from '../src/lib/mod-manager/api/RenderAPI';
import { executeThreeOverlayFrame } from '../src/components/canvas/3d/hooks/renderFramePipeline';

async function verifyThreeJsOverlay(): Promise<boolean> {
  console.log('='.repeat(60));
  console.log('开始验证 Three.js 叠加层逐帧渲染链路');
  console.log('='.repeat(60));
  console.log();

  resetRenderAPI();

  const renderApi = getRenderAPI();
  const modeManager = new SceneModeManager();
  const frameCount = 8;

  let beforeRenderCount = 0;
  let sceneRenderCount = 0;
  let labelRenderCount = 0;

  const sceneManager = {
    render: () => {
      sceneRenderCount += 1;
    },
    getScene: () => ({ id: 'mock-scene' }),
  };

  const labelRenderer = {
    render: () => {
      labelRenderCount += 1;
    },
  };

  renderApi.onBeforeRender(() => {
    beforeRenderCount += 1;
  });

  const switched = modeManager.switchMode(SceneMode.CESIUM_DOMINANT);

  console.log('测试1: 进入 CESIUM_DOMINANT 模式');
  console.log('-'.repeat(60));
  if (!switched || modeManager.getCurrentMode() !== SceneMode.CESIUM_DOMINANT) {
    console.error('❌ 失败: 无法切换到 CESIUM_DOMINANT 模式');
    return false;
  }
  console.log('✓ 场景模式已切换到 CESIUM_DOMINANT');
  console.log();

  console.log(`测试2: 在 CESIUM_DOMINANT 模式下连续推进 ${frameCount} 帧`);
  console.log('-'.repeat(60));
  for (let i = 0; i < frameCount; i += 1) {
    executeThreeOverlayFrame({
      sceneManager,
      camera: { id: 'mock-camera' },
      labelRenderer,
    });
  }

  let passed = true;

  if (beforeRenderCount === frameCount) {
    console.log(`✓ pre-render 回调连续执行 ${beforeRenderCount} 次`);
  } else {
    console.error(`❌ pre-render 回调执行次数异常: 期望 ${frameCount}, 实际 ${beforeRenderCount}`);
    passed = false;
  }

  if (sceneRenderCount === frameCount) {
    console.log(`✓ Three.js 场景渲染连续执行 ${sceneRenderCount} 次`);
  } else {
    console.error(`❌ Three.js 场景渲染次数异常: 期望 ${frameCount}, 实际 ${sceneRenderCount}`);
    passed = false;
  }

  if (labelRenderCount === frameCount) {
    console.log(`✓ 标签渲染连续执行 ${labelRenderCount} 次`);
  } else {
    console.error(`❌ 标签渲染次数异常: 期望 ${frameCount}, 实际 ${labelRenderCount}`);
    passed = false;
  }

  if (modeManager.getCurrentMode() === SceneMode.CESIUM_DOMINANT) {
    console.log('✓ 验证过程中场景模式保持在 CESIUM_DOMINANT');
  } else {
    console.error('❌ 验证过程中场景模式发生了意外变化');
    passed = false;
  }

  console.log();
  console.log('='.repeat(60));
  if (passed) {
    console.log('✓ 验证通过: CESIUM_DOMINANT 模式下 Three.js 叠加层驱动链路保持逐帧执行');
  } else {
    console.log('❌ 验证失败: Three.js 叠加层逐帧驱动链路存在异常');
  }
  console.log('='.repeat(60));

  return passed;
}

verifyThreeJsOverlay()
  .then(success => {
    resetRenderAPI();
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    resetRenderAPI();
    console.error('验证过程发生错误:', error);
    process.exit(1);
  });
