import * as THREE from 'three';

/**
 * 保留整段飞行的动态轨迹。采用可扩容 BufferAttribute，避免每个物理快照重建整条
 * Geometry；关闭视锥剔除和深度测试，让 Cesium 主导时的透明叠加层始终可见。
 */
export class TrajectoryRenderer {
  private readonly line: THREE.Line;
  private positions = new Float32Array(512 * 3);
  private positionAttribute: THREE.BufferAttribute;
  private pointCount = 0;
  private lastPoint: THREE.Vector3 | null = null;

  constructor() {
    const geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.positionAttribute);
    geometry.setDrawRange(0, 0);

    this.line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.9,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.line.name = 'SpaceFlightTrajectory';
    this.line.renderOrder = 90;
    this.line.frustumCulled = false;
    this.line.visible = false;
  }

  getObject(): THREE.Line {
    return this.line;
  }

  getPointCount(): number {
    return this.pointCount;
  }

  appendPoint(point: THREE.Vector3): void {
    if (this.lastPoint && this.lastPoint.distanceToSquared(point) < 1e-18) return;
    this.ensureCapacity(this.pointCount + 1);

    const offset = this.pointCount * 3;
    this.positions[offset] = point.x;
    this.positions[offset + 1] = point.y;
    this.positions[offset + 2] = point.z;
    this.pointCount += 1;
    this.lastPoint = point.clone();
    this.positionAttribute.needsUpdate = true;
    this.line.geometry.setDrawRange(0, this.pointCount);
    this.line.visible = this.pointCount >= 2;
  }

  reset(): void {
    this.pointCount = 0;
    this.lastPoint = null;
    this.line.geometry.setDrawRange(0, 0);
    this.line.visible = false;
  }

  dispose(): void {
    this.line.geometry.dispose();
    (this.line.material as THREE.Material).dispose();
  }

  private ensureCapacity(requiredPointCount: number): void {
    if (requiredPointCount <= this.positions.length / 3) return;
    const nextPositions = new Float32Array(this.positions.length * 2);
    nextPositions.set(this.positions);
    this.positions = nextPositions;
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.line.geometry.setAttribute('position', this.positionAttribute);
  }
}
