/**
 * 系外行星渲染器 (Exoplanet Renderer)
 *
 * 负责在 RenderWorld 中渲染已知系外行星系统的宿主恒星及其行星。
 *
 * 核心功能：
 * - 将 ICRS 坐标系的系外行星位置变换到 Three.js 渲染空间
 * - 基于恒星温度/行星半径着色
 * - 支持鼠标拾取（恒星/行星级别）
 * - 管理轨道线和标签显示
 * - 与 ExoplanetSystemRenderer 协作渲染选中系统的详细视图
 *
 * 数据来源：NASA Exoplanet Archive（通过后端 API 加载）
 */

import * as THREE from 'three';
import {
  estimateSemiMajorAxisAU,
  exoplanetEquatorialToCartesian,
  planetColorFromRadius,
  stellarColorFromTemperature,
  stellarRadiusSolarToAU,
} from '@/lib/exoplanets/coordinates';
import { SCALE_VIEW_CONFIG } from '@/lib/config/galaxyConfig';
import {
  ExoplanetHostIndex,
  ExoplanetPlanet,
  ExoplanetSelection,
  ExoplanetSystemDetails,
} from '@/lib/types/exoplanet';
import { OrbitLabel } from './OrbitLabel';
import { ExoplanetSystemRenderer } from './ExoplanetSystemRenderer';

type PickTarget =
  | { type: 'host'; hostname: string; distancePx: number }
  | { type: 'planet'; hostname: string; planetName: string; distancePx: number }
  | { type: 'system-star'; hostname: string; distancePx: number };

interface PlanetVisual {
  planet: ExoplanetPlanet;
  pivot: THREE.Group;
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  orbit: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  label: OrbitLabel | null;
  orbitRadius: number;
  visualRadius: number;
  phase: number;
  periodDays: number;
}

const SYSTEM_ORBIT_SCALE = 8;
const STAR_PICK_RADIUS_PX = 13;
const PLANET_PICK_RADIUS_PX = 16;

/**
 * 系外行星渲染器 — 将 NASA 系外行星数据渲染到 Three.js 场景中，支持拾取和交互。
 */
export class ExoplanetRenderer {
  private group = new THREE.Group();
  private hostsGroup = new THREE.Group();
  private systemGroup: THREE.Group | null = null;
  private pointCloud: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
  private systems: ExoplanetHostIndex[] = [];
  private hostIndexByName = new Map<string, number>();
  private hostPositions: THREE.Vector3[] = [];
  private hostBaseColors: THREE.Color[] = [];
  private hostBaseSizes: number[] = [];
  private hostColors: Float32Array | null = null;
  private hostSizes: Float32Array | null = null;
  private currentOpacity = 0;
  private targetOpacity = 0;
  private hoveredHostName: string | null = null;
  private hoveredPlanetName: string | null = null;
  private selectedSystem: ExoplanetSystemDetails | null = null;
  private planetVisuals: PlanetVisual[] = [];
  private systemStarMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | null = null;
  private systemStarGlow: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | null = null;
  private systemStarLabel: OrbitLabel | null = null;
  private elapsed = 0;
  private camera: THREE.Camera | null = null;
  public systemRenderer: ExoplanetSystemRenderer | null = null; // 暴露给调试面板

  constructor() {
    this.group.name = 'ExoplanetRenderer';
    this.hostsGroup.name = 'ExoplanetHosts';
    this.group.add(this.hostsGroup);
  }

  getGroup(): THREE.Group {
    return this.group;
  }
  
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
    if (this.systemRenderer) {
      this.systemRenderer.setCamera(camera);
    }
  }
  
  setTime(time: Date): void {
    if (this.systemRenderer) {
      this.systemRenderer.setTime(time);
    }
  }
  
  setTimeSpeed(speed: number): void {
    if (this.systemRenderer) {
      this.systemRenderer.setTimeSpeed(speed);
    }
  }

  setIndex(systems: ExoplanetHostIndex[]): void {
    if (this.systems === systems) {
      return;
    }

    this.disposeHosts();
    this.systems = systems;
    this.hostIndexByName.clear();
    this.hostPositions = [];
    this.hostBaseColors = [];
    this.hostBaseSizes = [];

    const positions = new Float32Array(systems.length * 3);
    const colors = new Float32Array(systems.length * 3);
    const sizes = new Float32Array(systems.length);

    systems.forEach((system, index) => {
      const position = exoplanetEquatorialToCartesian(system.raDeg, system.decDeg, system.distancePc);
      const color = stellarColorFromTemperature(system.stellarTemperatureK);
      const luminosity = system.stellarLuminosityLogSolar ?? 0;
      const planetsBoost = Math.min(system.planetCount, 8) * 0.5;
      // 增大基础大小从4到8，增大光度影响从1.2到2.0，增大最大值从15到28
      const size = THREE.MathUtils.clamp(8 + luminosity * 2.0 + planetsBoost, 5, 28);

      positions[index * 3] = position.x;
      positions[index * 3 + 1] = position.y;
      positions[index * 3 + 2] = position.z;
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      sizes[index] = size;

      this.hostIndexByName.set(system.hostname.toLowerCase(), index);
      this.hostPositions.push(position);
      this.hostBaseColors.push(color);
      this.hostBaseSizes.push(size);
    });

    this.hostColors = colors;
    this.hostSizes = sizes;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uBrightness: { value: 1 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uBrightness;

        void main() {
          vColor = color * uBrightness;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          float distanceScale = 2600000.0 / max(-mvPosition.z, 1.0);
          // 增大点大小范围从2.0-20.0到4.0-40.0
          gl_PointSize = clamp(size * distanceScale, 4.0, 40.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float uOpacity;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float core = 1.0 - smoothstep(0.0, 0.08, dist);
          float glow = 1.0 - smoothstep(0.05, 0.5, dist);
          vec3 finalColor = mix(vColor, vec3(1.0), core * 0.45);
          float alpha = (core + glow * 0.75) * uOpacity;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.pointCloud = new THREE.Points(geometry, material);
    this.pointCloud.frustumCulled = false;
    this.pointCloud.renderOrder = 94;
    this.hostsGroup.add(this.pointCloud);
  }

  setSelectedSystem(system: ExoplanetSystemDetails | null): void {
    if (this.selectedSystem === system) {
      return;
    }

    this.disposeSystem();
    this.selectedSystem = system;
    this.planetVisuals = [];
    this.systemStarMesh = null;
    
    if (!system) {
      // 清理系统渲染器
      if (this.systemRenderer) {
        this.systemRenderer.dispose();
        this.group.remove(this.systemRenderer.getGroup());
        this.systemRenderer = null;
      }
      return;
    }

    // 使用新的系统渲染器
    this.systemRenderer = new ExoplanetSystemRenderer();
    if (this.camera) {
      this.systemRenderer.setCamera(this.camera);
    }
    this.systemRenderer.setSystem(system);
    
    // 定位到恒星位置
    const hostPosition = exoplanetEquatorialToCartesian(
      system.star.raDeg,
      system.star.decDeg,
      system.star.distancePc
    );
    this.systemRenderer.getGroup().position.copy(hostPosition);
    this.group.add(this.systemRenderer.getGroup());
  }

  setSelectedBody(selection: ExoplanetSelection | null): void {
    this.applySelectedBody(selection);
  }

  setHoveredTarget(target: PickTarget | null): void {
    const hostName = target?.type === 'host' ? target.hostname : null;
    const planetName = target?.type === 'planet' ? target.planetName : null;
    this.setHoveredHost(hostName);
    this.setHoveredPlanet(planetName);
  }

  update(cameraDistance: number, deltaTime: number): void {
    this.elapsed += deltaTime;
    this.updateOpacity(cameraDistance, deltaTime);
    
    // 更新系统渲染器
    if (this.systemRenderer) {
      this.systemRenderer.update(deltaTime);
    }
  }


  pick(clientX: number, clientY: number, camera: THREE.Camera, container: HTMLElement): PickTarget | null {
    this.group.updateMatrixWorld(true);

    const planetPick = this.pickSystemBody(clientX, clientY, camera, container);
    const hostPick = this.pickHost(clientX, clientY, camera, container);

    if (planetPick && (!hostPick || planetPick.distancePx <= hostPick.distancePx)) {
      return planetPick;
    }

    return hostPick;
  }

  getHostWorldPosition(hostname: string): THREE.Vector3 | null {
    const index = this.hostIndexByName.get(hostname.toLowerCase());
    if (index === undefined) {
      return null;
    }

    return this.group.localToWorld(this.hostPositions[index]!.clone());
  }

  getPlanetWorldPosition(planetName: string): THREE.Vector3 | null {
    const visual = this.planetVisuals.find((item) => item.planet.name === planetName);
    if (!visual) {
      return null;
    }

    return visual.mesh.getWorldPosition(new THREE.Vector3());
  }

  getFocusDistanceForSystem(system: ExoplanetSystemDetails): number {
    const maxOrbit = this.getSystemMaxOrbit(system);
    return THREE.MathUtils.clamp(maxOrbit * SYSTEM_ORBIT_SCALE * 2.6, 3, 140);
  }

  getFocusRadiusForSelection(selection: ExoplanetSelection | null): number {
    if (selection?.type === 'planet') {
      const visual = this.planetVisuals.find((item) => item.planet.name === selection.planetName);
      return visual?.visualRadius ?? 0.03;
    }

    return this.selectedSystem ? this.getVisualStarRadius(this.selectedSystem) : 0.05;
  }

  dispose(): void {
    this.disposeHosts();
    this.disposeSystem();
    this.group.clear();
  }



  private updateOpacity(cameraDistance: number, deltaTime: number): void {
    const showStart = SCALE_VIEW_CONFIG.nearbyStarsShowStart;
    const showFull = SCALE_VIEW_CONFIG.nearbyStarsShowFull;
    const fadeStart = 12000 * 63241.077;
    const fadeEnd = 65000 * 63241.077;

    if (cameraDistance < showStart) {
      this.targetOpacity = 0;
    } else if (cameraDistance < showFull) {
      this.targetOpacity = (cameraDistance - showStart) / (showFull - showStart);
    } else if (cameraDistance < fadeStart) {
      this.targetOpacity = 1;
    } else if (cameraDistance < fadeEnd) {
      this.targetOpacity = 1 - (cameraDistance - fadeStart) / (fadeEnd - fadeStart);
    } else {
      this.targetOpacity = 0;
    }

    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * Math.min(deltaTime * 2.5, 1);
    this.hostsGroup.visible = this.currentOpacity > 0.01;

    if (this.pointCloud) {
      this.pointCloud.material.uniforms.uOpacity.value = this.currentOpacity;
    }

    if (this.systemGroup) {
      this.systemGroup.visible = true;
    }
  }

  private pickHost(
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    container: HTMLElement
  ): PickTarget | null {
    if (this.currentOpacity < 0.05 || this.systems.length === 0) {
      return null;
    }

    let best: PickTarget | null = null;
    const rect = container.getBoundingClientRect();

    for (let i = 0; i < this.systems.length; i++) {
      const candidate = this.pickHostAtIndex(i, clientX, clientY, camera, rect);
      if (candidate && (!best || candidate.distancePx < best.distancePx)) {
        best = candidate;
      }
    }

    return best;
  }

  private pickHostAtIndex(
    index: number,
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    rect: DOMRect
  ): PickTarget | null {
    const local = this.hostPositions[index];
    const system = this.systems[index];
    if (!local || !system) {
      return null;
    }

    const projected = local.clone();
    this.group.localToWorld(projected);
    projected.project(camera);

    if (projected.z < -1 || projected.z > 1) {
      return null;
    }

    const x = rect.left + (projected.x * 0.5 + 0.5) * rect.width;
    const y = rect.top + (projected.y * -0.5 + 0.5) * rect.height;
    const distancePx = Math.hypot(clientX - x, clientY - y);
    const threshold = STAR_PICK_RADIUS_PX + Math.min(system.planetCount, 8);

    return distancePx <= threshold
      ? { type: 'host', hostname: system.hostname, distancePx }
      : null;
  }

  private pickSystemBody(
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    container: HTMLElement
  ): PickTarget | null {
    if (!this.selectedSystem || !this.systemGroup) {
      return null;
    }

    const rect = container.getBoundingClientRect();
    const projected = new THREE.Vector3();
    let best: PickTarget | null = null;

    if (this.systemStarMesh) {
      this.systemStarMesh.getWorldPosition(projected);
      const starPick = this.projectPickTarget(projected, clientX, clientY, camera, rect);
      if (starPick !== null && starPick <= PLANET_PICK_RADIUS_PX) {
        best = { type: 'system-star', hostname: this.selectedSystem.hostname, distancePx: starPick };
      }
    }

    this.planetVisuals.forEach((visual) => {
      visual.mesh.getWorldPosition(projected);
      const distancePx = this.projectPickTarget(projected, clientX, clientY, camera, rect);
      if (distancePx !== null && distancePx <= PLANET_PICK_RADIUS_PX && (!best || distancePx < best.distancePx)) {
        best = {
          type: 'planet',
          hostname: this.selectedSystem!.hostname,
          planetName: visual.planet.name,
          distancePx,
        };
      }
    });

    return best;
  }

  private projectPickTarget(
    worldPosition: THREE.Vector3,
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    rect: DOMRect
  ): number | null {
    const projected = worldPosition.clone().project(camera);
    if (projected.z < -1 || projected.z > 1) {
      return null;
    }

    const x = rect.left + (projected.x * 0.5 + 0.5) * rect.width;
    const y = rect.top + (projected.y * -0.5 + 0.5) * rect.height;
    return Math.hypot(clientX - x, clientY - y);
  }

  private setHoveredHost(hostname: string | null): void {
    if (this.hoveredHostName === hostname) {
      return;
    }

    const previous = this.hoveredHostName;
    this.hoveredHostName = hostname;
    this.updateHostHighlight(previous, false);
    this.updateHostHighlight(hostname, true);
  }

  private setHoveredPlanet(planetName: string | null): void {
    if (this.hoveredPlanetName === planetName) {
      return;
    }

    const previous = this.hoveredPlanetName;
    this.hoveredPlanetName = planetName;
    this.updatePlanetHighlight(previous, false);
    this.updatePlanetHighlight(planetName, true);
  }

  private updateHostHighlight(hostname: string | null, highlighted: boolean): void {
    if (!hostname || !this.hostColors || !this.hostSizes || !this.pointCloud) {
      return;
    }

    const index = this.hostIndexByName.get(hostname.toLowerCase());
    if (index === undefined) {
      return;
    }

    const baseColor = this.hostBaseColors[index] ?? new THREE.Color(0xffffff);
    const color = highlighted ? baseColor.clone().lerp(new THREE.Color(0xffffff), 0.7) : baseColor;
    const size = (this.hostBaseSizes[index] ?? 5) * (highlighted ? 2.4 : 1);

    this.hostColors[index * 3] = color.r;
    this.hostColors[index * 3 + 1] = color.g;
    this.hostColors[index * 3 + 2] = color.b;
    this.hostSizes[index] = size;

    this.pointCloud.geometry.attributes.color.needsUpdate = true;
    this.pointCloud.geometry.attributes.size.needsUpdate = true;
  }

  private updatePlanetHighlight(planetName: string | null, highlighted: boolean): void {
    if (!planetName) {
      return;
    }

    const visual = this.planetVisuals.find((item) => item.planet.name === planetName);
    if (!visual) {
      return;
    }

    const baseColor = planetColorFromRadius(visual.planet.radiusEarth, visual.planet.equilibriumTemperatureK);
    const material = visual.mesh.material as THREE.MeshStandardMaterial;
    
    if (highlighted) {
      material.color.copy(baseColor.clone().lerp(new THREE.Color(0xffffff), 0.6));
      material.emissiveIntensity = 0.35;
    } else {
      material.color.copy(baseColor);
      material.emissiveIntensity = 0.15;
    }
    
    visual.mesh.scale.setScalar(highlighted ? 1.55 : 1);
    visual.orbit.material.opacity = highlighted ? 0.78 : 0.45;
  }

  private applySelectedBody(selection: ExoplanetSelection | null): void {
    if (!this.selectedSystem) {
      return;
    }

    this.planetVisuals.forEach((visual) => {
      const selected = selection?.type === 'planet' && selection.planetName === visual.planet.name;
      const baseColor = planetColorFromRadius(visual.planet.radiusEarth, visual.planet.equilibriumTemperatureK);
      const material = visual.mesh.material as THREE.MeshStandardMaterial;
      
      if (selected) {
        material.color.copy(baseColor.clone().lerp(new THREE.Color(0xffffff), 0.45));
        material.emissiveIntensity = 0.3;
      } else {
        material.color.copy(baseColor);
        material.emissiveIntensity = 0.15;
      }
      
      visual.mesh.scale.setScalar(selected ? 1.35 : 1);
      visual.orbit.material.opacity = selected ? 0.68 : 0.45;
    });

    if (this.systemStarMesh) {
      const selectedStar = !selection || selection.type === 'star';
      this.systemStarMesh.scale.setScalar(selectedStar ? 1.18 : 1);
      
      // 调整恒星光晕的亮度
      if (this.systemStarGlow) {
        const glowMaterial = this.systemStarGlow.material as THREE.MeshBasicMaterial;
        glowMaterial.opacity = selectedStar ? 0.35 : 0.25;
      }
    }
  }

  private getVisualStarRadius(system: ExoplanetSystemDetails): number {
    const realRadiusAU = stellarRadiusSolarToAU(system.star.stellarRadiusSolar);
    const maxOrbit = this.getSystemMaxOrbit(system);
    return THREE.MathUtils.clamp(realRadiusAU * 10, Math.min(maxOrbit * SYSTEM_ORBIT_SCALE * 0.28, 0.18), 0.55);
  }

  private getSystemMaxOrbit(system: ExoplanetSystemDetails): number {
    return Math.max(
      0.12,
      ...system.planets.map((planet, index) => (
        planet.semiMajorAxisAU
        ?? estimateSemiMajorAxisAU(planet.orbitalPeriodDays, system.star.stellarMassSolar)
        ?? (0.08 + index * 0.08)
      ))
    );
  }



  private disposeHosts(): void {
    if (this.pointCloud) {
      this.pointCloud.geometry.dispose();
      this.pointCloud.material.dispose();
      this.hostsGroup.remove(this.pointCloud);
      this.pointCloud = null;
    }
  }

  private disposeSystem(): void {
    // 清理系统渲染器
    if (this.systemRenderer) {
      this.systemRenderer.dispose();
      this.group.remove(this.systemRenderer.getGroup());
      this.systemRenderer = null;
    }
    
    if (!this.systemGroup) {
      return;
    }

    // 清理标签
    if (this.systemStarLabel) {
      this.systemStarLabel.dispose();
      this.systemStarLabel = null;
    }
    
    this.planetVisuals.forEach((visual) => {
      if (visual.label) {
        visual.label.dispose();
      }
    });

    this.systemGroup.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose());
        } else {
          material.dispose();
        }
      }
    });

    this.group.remove(this.systemGroup);
    this.systemGroup = null;
    this.systemStarMesh = null;
    this.systemStarGlow = null;
  }
}

/** 拾取目标类型 — 标识鼠标点击的是恒星还是行星 */
export type { PickTarget as ExoplanetPickTarget };
