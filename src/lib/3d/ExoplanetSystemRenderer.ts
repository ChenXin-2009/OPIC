/**
 * ExoplanetSystemRenderer.ts - 系外行星系统详细渲染器
 * 
 * 功能：
 * - 完整复用太阳系的视觉效果
 * - 渐变轨道圆盘
 * - 标签在轨道圆盘上
 * - 光照和阴影系统
 * - 行星材质和纹理
 * - 标记圈
 * - 独立的时间系统
 */

import * as THREE from 'three';
import { OrbitCurve } from './OrbitCurve';
import { OrbitLabel } from './OrbitLabel';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {
  ExoplanetPlanet,
  ExoplanetSystemDetails,
} from '@/lib/types/exoplanet';
import {
  estimateSemiMajorAxisAU,
  planetColorFromRadius,
  stellarColorFromTemperature,
  stellarRadiusSolarToAU,
} from '@/lib/exoplanets/coordinates';

// 系统缩放因子（使轨道可见）
const SYSTEM_ORBIT_SCALE = 8;

interface PlanetVisual {
  planet: ExoplanetPlanet;
  mesh: THREE.Mesh;
  markerRing: CSS2DObject; // 标记圈对象
  orbit: OrbitCurve;
  label: OrbitLabel;
  orbitRadius: number;
  visualRadius: number;
  periodDays: number;
  currentAngle: number;
  // 标记圈透明度控制
  currentOpacity: number;
  targetOpacity: number;
}

interface StarVisual {
  mesh: THREE.Mesh;
  glowMeshes: THREE.Mesh[];
  light: THREE.PointLight;
  label: OrbitLabel;
}

export class ExoplanetSystemRenderer {
  private group: THREE.Group;
  private system: ExoplanetSystemDetails | null = null;
  private star: StarVisual | null = null;
  private planets: PlanetVisual[] = [];
  private camera: THREE.Camera | null = null;
  private currentTime: number = 0; // 系统内部时间（天）
  private timeSpeed: number = 1; // 时间流速
  
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ExoplanetSystemRenderer';
  }
  
  getGroup(): THREE.Group {
    return this.group;
  }
  
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }
  
  setSystem(system: ExoplanetSystemDetails | null): void {
    this.dispose();
    this.system = system;
    this.currentTime = 0; // 重置时间
    
    if (!system) {
      return;
    }
    
    this.createStar(system);
    this.createPlanets(system);
  }
  
  private createStar(system: ExoplanetSystemDetails): void {
    const starColor = stellarColorFromTemperature(system.star.stellarTemperatureK);
    const starRadius = this.calculateStarRadius(system);
    
    // 创建恒星主体（使用与太阳相同的着色器）
    const starGeometry = new THREE.SphereGeometry(starRadius, 64, 64);
    
    // 使用与太阳相同的着色器材质
    const starMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunColor;
        uniform float uIntensity;
        uniform float uLimbDarkeningStrength;
        uniform float uTurbulenceStrength;
        uniform float uGranuleStrength;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          
          for (int i = 0; i < 4; i++) {
            value += amplitude * noise(p * frequency);
            frequency *= 2.0;
            amplitude *= 0.5;
          }
          
          return value;
        }
        
        void main() {
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = dot(viewDirection, vNormal);
          
          float limbDarkening = pow(fresnel, uLimbDarkeningStrength);
          
          vec2 uvDistorted = vUv * 8.0 + uTime;
          float turbulence = fbm(uvDistorted) * uTurbulenceStrength;
          
          vec2 uvGranules = vUv * 40.0 + uTime * 2.0;
          float granules = noise(uvGranules) * uGranuleStrength;
          
          float brightness = limbDarkening + turbulence + granules;
          brightness = clamp(brightness, 0.7, 1.3);
          
          vec3 finalColor = uSunColor * brightness * uIntensity;
          
          float edgeGlow = pow(1.0 - fresnel, 3.0) * 0.3;
          finalColor += vec3(edgeGlow);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      uniforms: {
        uTime: { value: 0.0 },
        uSunColor: { value: starColor },
        uIntensity: { value: 1.2 },
        uLimbDarkeningStrength: { value: 1.8 },
        uTurbulenceStrength: { value: 0.15 },
        uGranuleStrength: { value: 0.08 },
      },
      side: THREE.FrontSide,
    });
    
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    this.group.add(starMesh);
    
    // 创建光晕效果（使用与太阳相同的 Sprite 方法）
    const glowMeshes: THREE.Mesh[] = [];
    
    // 主光晕
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0.0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.12, 'rgba(255,245,220,0.95)');
    grad.addColorStop(0.28, 'rgba(255,220,120,0.8)');
    grad.addColorStop(0.5, 'rgba(255,180,80,0.45)');
    grad.addColorStop(0.85, 'rgba(255,140,40,0.12)');
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      color: starColor,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    const baseSize = starRadius * 8 * 2;
    sprite.scale.set(baseSize, baseSize, 1);
    sprite.renderOrder = 999;
    this.group.add(sprite);
    glowMeshes.push(sprite as unknown as THREE.Mesh);
    
    // 创建点光源
    const luminosity = system.star.stellarLuminosityLogSolar ?? 0;
    const lightIntensity = THREE.MathUtils.clamp(Math.pow(10, luminosity) * 2, 0.5, 10);
    const light = new THREE.PointLight(starColor, lightIntensity, 0, 2);
    light.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    this.group.add(light);
    
    // 创建恒星标签
    const label = new OrbitLabel({
      textEn: system.hostname,
      textZh: system.hostname,
      color: '#' + starColor.getHexString(),
      orbitRadius: starRadius * 3,
      orbitSpacing: starRadius * 6,
    });
    this.group.add(label.getSprite());
    
    this.star = {
      mesh: starMesh,
      glowMeshes,
      light,
      label,
    };
  }
  
  private createPlanets(system: ExoplanetSystemDetails): void {
    system.planets.forEach((planet, index) => {
      const planetVisual = this.createPlanet(planet, system, index);
      this.planets.push(planetVisual);
      
      // 添加到场景
      this.group.add(planetVisual.orbit.getLine());
      this.group.add(planetVisual.mesh);
      // markerRing 已经通过 mesh.add(markerRing) 添加到行星网格了，不需要再添加到 group
      this.group.add(planetVisual.label.getSprite());
    });
  }
  
  private createPlanet(
    planet: ExoplanetPlanet,
    system: ExoplanetSystemDetails,
    index: number
  ): PlanetVisual {
    // 计算轨道半径
    const semiMajorAxis = planet.semiMajorAxisAU
      ?? estimateSemiMajorAxisAU(planet.orbitalPeriodDays, system.star.stellarMassSolar)
      ?? (0.08 + index * 0.08);
    const orbitRadius = Math.max(0.035 + index * 0.012, semiMajorAxis * SYSTEM_ORBIT_SCALE);
    
    // 计算行星半径（使用真实比例）
    const earthRadiusAU = 0.000043; // 地球半径（AU）
    const realRadiusAU = (planet.radiusEarth ?? 1) * earthRadiusAU;
    // 使用真实半径，但设置最小值以确保可见
    const visualRadius = Math.max(realRadiusAU, 0.0001);
    
    // 计算行星颜色和材质属性
    const color = planetColorFromRadius(planet.radiusEarth, planet.equilibriumTemperatureK);
    const materialProps = this.getPlanetMaterialProperties(planet);
    
    // 创建行星网格（使用 MeshStandardMaterial 支持光照）
    const planetGeometry = new THREE.SphereGeometry(visualRadius, 32, 16);
    const planetMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: materialProps.emissive,
      emissiveIntensity: materialProps.emissiveIntensity,
      roughness: materialProps.roughness,
      metalness: materialProps.metalness,
    });
    const mesh = new THREE.Mesh(planetGeometry, planetMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // 创建标记圈（使用 CSS2DObject，与太阳系相同）
    const markerRing = this.createMarkerRing(visualRadius, color);
    // 设置行星名称数据属性
    (markerRing.element as HTMLDivElement).dataset.planetName = planet.name;
    if (markerRing) {
      mesh.add(markerRing);
    }
    
    // 创建轨道（不应用倾角，保持在生成平面）
    const orbitElements = this.createOrbitElements(orbitRadius, 0);
    const orbit = new OrbitCurve(
      orbitElements,
      '#' + color.getHexString(),
      160,
      undefined,
      mesh.position
    );
    
    // 应用固定旋转：从 XY 平面旋转到 XZ 平面（水平面）
    // 与太阳系环的旋转相同：rotation.x = -Math.PI / 2
    const orbitLine = orbit.getLine();
    orbitLine.rotation.x = -Math.PI / 2; // -90度，从 XY 平面旋转到 XZ 平面
    
    // 创建标签
    const label = new OrbitLabel({
      textEn: planet.name,
      textZh: planet.letter ? `${system.hostname} ${planet.letter}` : planet.name,
      color: '#' + color.getHexString(),
      orbitRadius: orbitRadius,
      orbitSpacing: orbitRadius * 0.3,
    });
    
    // 初始位置（在 XZ 平面上，与旋转后的轨道对齐）
    const initialAngle = this.hashToAngle(planet.name);
    mesh.position.set(
      Math.cos(initialAngle) * orbitRadius,
      0, // Y = 0，在 XZ 平面上
      Math.sin(initialAngle) * orbitRadius
    );
    
    return {
      planet,
      mesh,
      markerRing,
      orbit,
      label,
      orbitRadius,
      visualRadius,
      periodDays: Math.max(planet.orbitalPeriodDays ?? (20 + index * 30), 0.5),
      currentAngle: initialAngle,
      currentOpacity: 1.0,
      targetOpacity: 1.0,
    };
  }
  
  /**
   * 根据行星参数确定材质属性
   */
  private getPlanetMaterialProperties(planet: ExoplanetPlanet): {
    emissive: THREE.Color;
    emissiveIntensity: number;
    roughness: number;
    metalness: number;
  } {
    const radius = planet.radiusEarth ?? 1;
    const temp = planet.equilibriumTemperatureK ?? 300;
    const color = planetColorFromRadius(radius, temp);
    
    // 热木星（高温巨行星）
    if (temp > 1000 && radius > 6) {
      return {
        emissive: color,
        emissiveIntensity: 0.4, // 强自发光
        roughness: 0.6,
        metalness: 0.1,
      };
    }
    
    // 熔岩行星（高温小行星）
    if (temp > 1000 && radius < 2) {
      return {
        emissive: color,
        emissiveIntensity: 0.5, // 很强的自发光
        roughness: 0.7,
        metalness: 0.2,
      };
    }
    
    // 气态巨行星（类木星）
    if (radius > 6) {
      return {
        emissive: color,
        emissiveIntensity: 0.1,
        roughness: 0.5,
        metalness: 0.05,
      };
    }
    
    // 海王星型行星
    if (radius > 2.5 && radius <= 6) {
      return {
        emissive: color,
        emissiveIntensity: 0.12,
        roughness: 0.6,
        metalness: 0.08,
      };
    }
    
    // 超级地球
    if (radius > 1.4 && radius <= 2.5) {
      return {
        emissive: color,
        emissiveIntensity: 0.08,
        roughness: 0.8,
        metalness: 0.15,
      };
    }
    
    // 类地行星
    return {
      emissive: color,
      emissiveIntensity: 0.05,
      roughness: 0.9,
      metalness: 0.1,
    };
  }
  
  /**
   * 创建标记圈（与太阳系完全相同的实现）
   */
  private createMarkerRing(_planetRadius: number, color: THREE.Color): CSS2DObject {
    // 使用与太阳系完全相同的配置和样式
    const MARKER_CONFIG = {
      size: 20,
      strokeWidth: 2,
      baseOpacity: 1.0,
      fadeSpeed: 0.2,
      minOpacity: 0.1,
    };
    
    const markerDiv = document.createElement('div');
    markerDiv.style.width = `${MARKER_CONFIG.size}px`;
    markerDiv.style.height = `${MARKER_CONFIG.size}px`;
    markerDiv.style.border = `${MARKER_CONFIG.strokeWidth}px solid #${color.getHexString()}`;
    markerDiv.style.borderRadius = '50%';
    markerDiv.style.pointerEvents = 'auto'; // 允许点击
    markerDiv.style.cursor = 'pointer'; // 鼠标悬停时显示手型光标
    markerDiv.style.userSelect = 'none';
    markerDiv.style.opacity = '1';
    markerDiv.style.transition = 'opacity 0.2s ease-out';
    markerDiv.style.position = 'absolute';
    markerDiv.style.transform = 'translate(-50%, -50%)';
    markerDiv.style.display = 'block';
    markerDiv.style.visibility = 'visible';
    markerDiv.style.backgroundColor = 'transparent';
    markerDiv.style.boxSizing = 'border-box';
    
    // 添加数据属性，用于点击检测
    markerDiv.dataset.planetName = ''; // 将在创建时设置
    markerDiv.dataset.isExoplanetMarker = 'true';
    
    // 创建 CSS2DObject
    const markerObject = new CSS2DObject(markerDiv);
    markerObject.position.set(0, 0, 0);
    
    return markerObject;
  }
  
  private createOrbitElements(radius: number, _inclinationDeg?: number): any {
    // 创建简化的轨道元素（圆形轨道，水平放置）
    // 注意：轨道默认在 XY 平面生成，需要通过旋转移到 XZ 平面（水平面）
    return {
      a: radius,
      e: 0, // 圆形轨道
      i: 0, // 倾角为0，保持在生成平面
      L: 0,
      w_bar: 0,
      O: 0,
      a_dot: 0,
      e_dot: 0,
      i_dot: 0,
      L_dot: 0,
      w_bar_dot: 0,
      O_dot: 0,
    };
  }
  
  private calculateStarRadius(system: ExoplanetSystemDetails): number {
    // 使用真实恒星半径
    const realRadiusAU = stellarRadiusSolarToAU(system.star.stellarRadiusSolar);
    // 设置最小值以确保可见
    return Math.max(realRadiusAU, 0.001);
  }
  

  
  private hashToAngle(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return (hash / 0xffffffff) * Math.PI * 2;
  }
  
  setTime(time: Date): void {
    // 将 Date 转换为天数（相对于某个参考点）
    const referenceDate = new Date('2000-01-01T00:00:00Z');
    this.currentTime = (time.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
  }
  
  setTimeSpeed(speed: number): void {
    this.timeSpeed = speed;
  }
  
  update(deltaTime: number): void {
    if (!this.system || !this.camera) {
      return;
    }
    
    // 更新时间（deltaTime 是秒，转换为天）
    const daysPerSecond = 4 * this.timeSpeed; // 加速4倍
    this.currentTime += (deltaTime * daysPerSecond);
    
    // 更新行星位置
    this.planets.forEach((visual) => {
      // 计算新角度
      const angularVelocity = (2 * Math.PI) / visual.periodDays;
      visual.currentAngle += angularVelocity * daysPerSecond * deltaTime;
      
      // 更新位置（在 XZ 平面上，与旋转后的轨道对齐）
      visual.mesh.position.set(
        Math.cos(visual.currentAngle) * visual.orbitRadius,
        0, // Y = 0，在 XZ 平面上
        Math.sin(visual.currentAngle) * visual.orbitRadius
      );
      
      // 更新标记圈透明度（平滑过渡）
      this.updateMarkerOpacity(visual);
      
      // 更新轨道渐变
      visual.orbit.updatePlanetPosition(visual.mesh.position);
      
      // 更新标签（camera 已经在上面检查过不为 null）
      const orbitNormal = new THREE.Vector3(0, 1, 0);
      visual.label.updatePositionWithCamera(
        visual.mesh.position,
        orbitNormal,
        this.camera!,
        false // 使用行星模式（固定在轨道下方）
      );
    });
    
    // 更新恒星标签
    if (this.star) {
      const orbitNormal = new THREE.Vector3(0, 1, 0);
      this.star.label.updatePositionWithCamera(
        new THREE.Vector3(0, 0, 0),
        orbitNormal,
        this.camera!,
        false
      );
    }
  }
  
  /**
   * 更新标记圈透明度（与太阳系相同的实现）
   */
  private updateMarkerOpacity(visual: PlanetVisual): void {
    const MARKER_CONFIG = {
      fadeSpeed: 0.2,
      minOpacity: 0.1,
    };
    
    // 平滑过渡透明度
    const diff = visual.targetOpacity - visual.currentOpacity;
    if (Math.abs(diff) > 0.001) {
      visual.currentOpacity += diff * MARKER_CONFIG.fadeSpeed;
      visual.currentOpacity = Math.max(0, Math.min(1, visual.currentOpacity));
    } else {
      visual.currentOpacity = visual.targetOpacity;
    }
    
    // 更新DOM元素的透明度
    const markerDiv = visual.markerRing.element as HTMLDivElement;
    markerDiv.style.opacity = visual.currentOpacity.toString();
    
    // 确保标记圈在可见时显示，不可见时隐藏（避免点击穿透）
    if (visual.currentOpacity > MARKER_CONFIG.minOpacity) {
      markerDiv.style.display = 'block';
    } else {
      markerDiv.style.display = 'none';
    }
  }
  
  /**
   * 设置行星标记圈的目标透明度（用于重叠检测）
   */
  setMarkerTargetOpacity(planetName: string, opacity: number): void {
    const visual = this.planets.find(p => p.planet.name === planetName);
    if (visual) {
      visual.targetOpacity = Math.max(0, Math.min(1, opacity));
    }
  }
  
  /**
   * 获取所有行星的屏幕位置（用于重叠检测）
   */
  getPlanetScreenPositions(camera: THREE.Camera, width: number, height: number): Array<{
    name: string;
    screenX: number;
    screenY: number;
    markerSize: number;
  }> {
    return this.planets.map(visual => {
      const worldPos = visual.mesh.position.clone();
      worldPos.project(camera);
      
      return {
        name: visual.planet.name,
        screenX: (worldPos.x * 0.5 + 0.5) * width,
        screenY: (worldPos.y * -0.5 + 0.5) * height,
        markerSize: 20, // MARKER_CONFIG.size
      };
    });
  }
  
  setOpacity(opacity: number): void {
    // 设置所有对象的透明度
    this.planets.forEach((visual) => {
      visual.mesh.visible = opacity > 0.01;
      if (visual.markerRing) {
        visual.markerRing.visible = opacity > 0.01;
      }
      visual.orbit.setOpacity(opacity);
      visual.label.setOpacity(opacity);
    });
    
    if (this.star) {
      this.star.mesh.visible = opacity > 0.01;
      this.star.glowMeshes.forEach((glow) => {
        glow.visible = opacity > 0.01;
      });
      this.star.label.setOpacity(opacity);
    }
  }
  
  dispose(): void {
    // 清理行星
    this.planets.forEach((visual) => {
      visual.mesh.geometry.dispose();
      (visual.mesh.material as THREE.Material).dispose();
      
      // CSS2DObject 不需要 dispose geometry 和 material
      // 只需要从父对象中移除即可
      if (visual.markerRing) {
        visual.mesh.remove(visual.markerRing);
      }
      
      visual.label.dispose();
    });
    this.planets = [];
    
    // 清理恒星
    if (this.star) {
      this.star.mesh.geometry.dispose();
      (this.star.mesh.material as THREE.Material).dispose();
      
      this.star.glowMeshes.forEach((glow) => {
        glow.geometry.dispose();
        (glow.material as THREE.Material).dispose();
      });
      
      this.star.label.dispose();
      this.star = null;
    }
    
    // 清空组
    this.group.clear();
    this.system = null;
  }
}
