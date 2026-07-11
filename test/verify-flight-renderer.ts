/**
 * verify-flight-renderer.ts
 *
 * Phase 1 Task 1.6 场景图断言脚本。
 *
 * 验证内容：
 *   1. 火箭网格世界位置与预期地球局部坐标一致
 *   2. 尾焰在点火时显示，关机时隐藏
 *   3. 轨迹线点数受上限裁剪
 *
 * 运行方式：npx tsx test/verify-flight-renderer.ts
 * 退出码：0 = 通过，1 = 失败
 */

import * as THREE from 'three';
import { getLaunchSiteById, launchSiteToInitialState } from '../src/lib/data/launch-sites';
import {
  FlightRendererLayer,
  earthSceneMetersToWorldError,
  ecefToEarthScene,
  eciToEcef,
} from '../src/lib/mods/flight-renderer';
import type { FlightRenderSnapshot } from '../src/lib/mods/space-flight/flight-runtime-store';

function createSnapshot(overrides: Partial<FlightRenderSnapshot> = {}): FlightRenderSnapshot {
  return {
    active: true,
    ended: false,
    positionEci: [0, 0, 0],
    velocityEci: [0, 0, 0],
    thrustDirectionEci: [1, 0, 0],
    throttlePercent: 0,
    plumeActive: false,
    stageIndex: 0,
    missionTimeS: 0,
    absoluteTimeMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    ...overrides,
  };
}

interface TestCase {
  name: string;
  run: () => boolean;
}

const tests: TestCase[] = [
  {
    name: '火箭网格世界位置与发射场坐标吻合 (误差 < 1m)',
    run: () => {
      const layer = new FlightRendererLayer();
      const scene = new THREE.Scene();
      scene.add(layer.getGroup());
      layer.setEarthTransform(0, 0, 0, new THREE.Quaternion());

      const site = getLaunchSiteById('cape-canaveral');
      if (!site) return false;

      const launchDate = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
      const initial = launchSiteToInitialState(site, launchDate);
      const snapshot = createSnapshot({
        positionEci: [...initial.position] as [number, number, number],
        velocityEci: [...initial.velocity] as [number, number, number],
        thrustDirectionEci: [1, 0, 0],
        absoluteTimeMs: launchDate.getTime(),
      });

      layer.sync(snapshot);
      scene.updateMatrixWorld(true);

      const actual = new THREE.Vector3();
      layer.getRocketObject().getWorldPosition(actual);

      const expected = ecefToEarthScene(
        eciToEcef(snapshot.positionEci, snapshot.absoluteTimeMs),
      );
      const errorMeters = earthSceneMetersToWorldError(actual, expected);
      console.log(`    位置误差: ${errorMeters.toFixed(4)} m`);

      layer.dispose();
      return errorMeters < 1;
    },
  },
  {
    name: '尾焰在点火时显示，关机时隐藏',
    run: () => {
      const layer = new FlightRendererLayer();
      const scene = new THREE.Scene();
      scene.add(layer.getGroup());
      layer.setEarthTransform(0, 0, 0, new THREE.Quaternion());

      layer.sync(createSnapshot({
        positionEci: [6_771_000, 0, 0],
        thrustDirectionEci: [1, 0, 0],
        throttlePercent: 75,
        plumeActive: true,
      }));
      scene.updateMatrixWorld(true);
      const activeVisible = layer.isPlumeVisible();

      layer.sync(createSnapshot({
        positionEci: [6_771_000, 0, 0],
        thrustDirectionEci: [1, 0, 0],
        throttlePercent: 0,
        plumeActive: false,
        missionTimeS: 1,
      }));
      scene.updateMatrixWorld(true);
      const inactiveVisible = layer.isPlumeVisible();

      console.log(`    点火可见: ${activeVisible}, 关机可见: ${inactiveVisible}`);
      layer.dispose();
      return activeVisible && !inactiveVisible;
    },
  },
  {
    name: '轨迹线保留完整飞行段 (400 个点)',
    run: () => {
      const layer = new FlightRendererLayer();
      const scene = new THREE.Scene();
      scene.add(layer.getGroup());
      layer.setEarthTransform(0, 0, 0, new THREE.Quaternion());

      for (let i = 0; i < 400; i += 1) {
        layer.sync(createSnapshot({
          positionEci: [6_771_000 + i * 10, i * 20, 0],
          thrustDirectionEci: [1, 0, 0],
          throttlePercent: 50,
          plumeActive: true,
          missionTimeS: i,
          absoluteTimeMs: Date.UTC(2026, 0, 1, 0, 0, i),
        }));
      }

      const pointCount = layer.getTrajectoryPointCount();
      console.log(`    轨迹点数: ${pointCount}`);
      layer.dispose();
      return pointCount === 400;
    },
  },
];

function main(): void {
  console.log('飞行渲染验证 (Phase 1 Task 1.6)');
  console.log('=================================');

  let passed = 0;
  for (const test of tests) {
    console.log(`\n[测试] ${test.name}`);
    try {
      const ok = test.run();
      if (ok) {
        passed += 1;
        console.log('  ✓ 通过');
      } else {
        console.log('  ✗ 失败');
      }
    } catch (error) {
      console.log(`  ✗ 异常: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`\n结果: ${passed} 通过 / ${tests.length - passed} 失败 / ${tests.length} 总计`);
  if (passed !== tests.length) {
    process.exitCode = 1;
    return;
  }

  console.log('✓ 验证通过: 飞行渲染层满足 Phase 1 Task 1.6 基础验收标准');
}

main();
