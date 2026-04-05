/**
 * @module mods/flight-tracking/renderer/FlightPathRenderer
 * @description 航迹线 Cesium 渲染器
 */

import * as Cesium from 'cesium';
import type { FlightPath } from '../types';

export class FlightPathRenderer {
  private viewer: Cesium.Viewer | null = null;
  private pathEntity: Cesium.Entity | null = null;

  initialize(viewer: Cesium.Viewer): void {
    this.viewer = viewer;
  }

  showPath(path: FlightPath): void {
    if (!this.viewer) return;
    this.hidePath();

    const positions = path.points.map(p =>
      Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.altitude)
    );

    if (positions.length < 2) return;

    const color = path.type === 'history'
      ? Cesium.Color.CYAN.withAlpha(0.8)
      : Cesium.Color.YELLOW.withAlpha(0.5);

    this.pathEntity = this.viewer.entities.add({
      polyline: {
        positions,
        width: 2,
        material: color,
        clampToGround: false,
        arcType: Cesium.ArcType.NONE,
      },
    });
  }

  hidePath(): void {
    if (this.viewer && this.pathEntity) {
      this.viewer.entities.remove(this.pathEntity);
      this.pathEntity = null;
    }
  }

  dispose(): void {
    this.hidePath();
    this.viewer = null;
  }
}
