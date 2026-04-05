/**
 * @module mods/flight-tracking/renderer/AircraftRenderer
 * @description 航空器 Cesium 渲染器
 *
 * 使用 Cesium Entity 渲染飞机图标，支持点击交互和高度颜色映射。
 */

import * as Cesium from 'cesium';
import type { Flight, AltitudeColors } from '../types';
import { getAltitudeKey } from '../utils/dataParser';
import { createAircraftIcon } from '../utils/iconGenerator';

export class AircraftRenderer {
  private viewer: Cesium.Viewer | null = null;
  private entities: Map<string, Cesium.Entity> = new Map();
  private clickHandler: Cesium.ScreenSpaceEventHandler | null = null;
  private altitudeColors: AltitudeColors;
  onAircraftClick: ((icao24: string) => void) | null = null;

  constructor(altitudeColors: AltitudeColors) {
    this.altitudeColors = altitudeColors;
  }

  initialize(viewer: Cesium.Viewer): void {
    this.viewer = viewer;
    this.setupClickHandler();
  }

  update(flights: Flight[]): void {
    if (!this.viewer) return;

    const currentIds = new Set(flights.map(f => f.icao24));

    // 移除已消失的飞机
    for (const [id, entity] of this.entities) {
      if (!currentIds.has(id)) {
        this.viewer.entities.remove(entity);
        this.entities.delete(id);
      }
    }

    // 添加或更新飞机
    for (const flight of flights) {
      if (!flight.position) continue;

      const existing = this.entities.get(flight.icao24);
      if (existing) {
        this.updateEntity(existing, flight);
      } else {
        const entity = this.createEntity(flight);
        this.entities.set(flight.icao24, entity);
      }
    }
  }

  selectAircraft(icao24: string | null): void {
    for (const [id, entity] of this.entities) {
      if (entity.billboard) {
        entity.billboard.scale = new Cesium.ConstantProperty(id === icao24 ? 0.8 : 0.5);
      }
    }
  }

  updateColors(colors: AltitudeColors): void {
    this.altitudeColors = colors;
  }

  dispose(): void {
    this.clickHandler?.destroy();
    this.clickHandler = null;

    if (this.viewer) {
      for (const entity of this.entities.values()) {
        this.viewer.entities.remove(entity);
      }
    }
    this.entities.clear();
    this.viewer = null;
  }

  // ---- 私有方法 ----

  private createEntity(flight: Flight): Cesium.Entity {
    const pos = flight.position!;
    const color = this.getColor(flight);
    const icon = createAircraftIcon(color);

    const entity = this.viewer!.entities.add({
      id: flight.icao24,
      position: Cesium.Cartesian3.fromDegrees(pos.longitude, pos.latitude, pos.altitude),
      billboard: {
        image: icon,
        scale: 0.5,
        rotation: Cesium.Math.toRadians(-(flight.trueTrack ?? 0)),
        alignedAxis: Cesium.Cartesian3.UNIT_Z,
        heightReference: Cesium.HeightReference.NONE,
        // 仅在相机距离 200km 以内时禁用深度测试（避免被地形遮挡）
        // 超出此距离正常做深度测试，地球背面的飞机会被剔除
        disableDepthTestDistance: 2e5,
      },
      label: {
        text: flight.callsign ?? flight.icao24,
        show: false,
        font: '11px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: 2e5,
      },
    });

    return entity;
  }

  private updateEntity(entity: Cesium.Entity, flight: Flight): void {
    const pos = flight.position!;
    const color = this.getColor(flight);
    const icon = createAircraftIcon(color);

    entity.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartesian3.fromDegrees(pos.longitude, pos.latitude, pos.altitude)
    );

    if (entity.billboard) {
      entity.billboard.image = new Cesium.ConstantProperty(icon);
      entity.billboard.rotation = new Cesium.ConstantProperty(
        Cesium.Math.toRadians(-(flight.trueTrack ?? 0))
      );
    }
  }

  private getColor(flight: Flight): string {
    const key = getAltitudeKey(flight.position?.altitude ?? 0, flight.onGround);
    return this.altitudeColors[key];
  }

  private setupClickHandler(): void {
    if (!this.viewer) return;

    this.clickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.clickHandler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = this.viewer!.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id instanceof Cesium.Entity) {
        const id = picked.id.id;
        if (id && this.entities.has(id)) {
          this.onAircraftClick?.(id);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }
}
