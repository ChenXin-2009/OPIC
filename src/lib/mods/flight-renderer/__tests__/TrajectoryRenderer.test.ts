import * as THREE from 'three';
import { TrajectoryRenderer } from '../TrajectoryRenderer';

describe('TrajectoryRenderer', () => {
  it('keeps the complete trajectory instead of discarding older points', () => {
    const renderer = new TrajectoryRenderer();
    for (let index = 0; index < 400; index += 1) {
      renderer.appendPoint(new THREE.Vector3(index, index * 2, 0));
    }

    expect(renderer.getPointCount()).toBe(400);
    expect(renderer.getObject().geometry.drawRange.count).toBe(400);
    expect(renderer.getObject().frustumCulled).toBe(false);
    renderer.dispose();
  });
});
