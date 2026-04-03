/**
 * SolarSystemCanvas3D.tsx - 太阳系 3D Three.js 渲染组件
 * 
 * 功能：
 * - 使用 Three.js 渲染 3D 太阳系场景
 * - 管理行星、轨道、标签的创建和更新
 * - 实现点击聚焦、跟踪、缩放等交互功能
 * - 处理重叠检测和标签显示逻辑
 * - 集成星空背景、轨道渐变、太阳光晕等视觉效果
 * 
 * 主要组件：
 * - SceneManager: 场景、渲染器、相机管理
 * - CameraController: 相机控制和交互
 * - Planet: 行星网格和标记圈
 * - OrbitCurve: 3D 轨道曲线
 * - CSS2DRenderer: 2D 标签渲染
 */

'use client';

import React, { useRef, useLayoutEffect, useState } from 'react';
import { useSolarSystemStore } from '@/lib/state';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { SceneManager } from '@/lib/3d/SceneManager';
import { CameraController } from '@/lib/3d/CameraController';
import { Planet } from '@/lib/3d/Planet';
import { EarthPlanet } from '@/lib/3d/EarthPlanet';
import { OrbitCurve } from '@/lib/3d/OrbitCurve';
import { OrbitLabel } from '@/lib/3d/OrbitLabel';
import { SatelliteOrbit } from '@/lib/3d/SatelliteOrbit';
import { SATELLITE_DEFINITIONS } from '@/lib/astronomy/orbit';
import { dateToJulianDay } from '@/lib/astronomy/time';
import { ORBITAL_ELEMENTS } from '@/lib/astronomy/orbit';
import { planetNames } from '@/lib/astronomy/names';
import { CELESTIAL_BODIES } from '@/lib/types/celestialTypes';
import * as THREE from 'three';
import { Raycaster } from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import ScaleRuler from './ScaleRuler';
import GridScaleRuler from './GridScaleRuler';
import DistanceDisplay from './DistanceDisplay';
import SettingsMenu from '@/components/SettingsMenu';
import CelestialSearch from '@/components/search/CelestialSearch';
import SearchErrorBoundary from '@/components/search/SearchErrorBoundary';
import { ORBIT_COLORS, SUN_LIGHT_CONFIG, ORBIT_CURVE_POINTS, SATELLITE_CONFIG, ORBIT_FADE_CONFIG, FAR_VIEW_CONFIG } from '@/lib/config/visualConfig';
import { CAMERA_CONFIG } from '@/lib/config/cameraConfig';
import { TextureManager } from '@/lib/3d/TextureManager';
import { LocalGroupRenderer } from '@/lib/3d/LocalGroupRenderer';
import { NearbyGroupsRenderer } from '@/lib/3d/NearbyGroupsRenderer';
import { VirgoSuperclusterRenderer } from '@/lib/3d/VirgoSuperclusterRenderer';
import { LaniakeaSuperclusterRenderer } from '@/lib/3d/LaniakeaSuperclusterRenderer';
import { SatelliteLayer } from '@/lib/3d/SatelliteLayer';
import { UniverseScale } from '@/lib/types/universeTypes';
import type { LocalGroupGalaxy, GalaxyGroup, SimpleGalaxy, GalaxyCluster, Supercluster } from '@/lib/types/universeTypes';
import SatelliteDetailModal from '@/components/satellite/SatelliteDetailModal';


// ==================== 可调参数配置 ====================
// ⚙️ 以下参数可在文件顶部调整，影响 3D 场景显示效果

// 轨道颜色使用集中配置 `ORBIT_COLORS`（位于 src/lib/config/visualConfig.ts）

// 行星自转速度（弧度/秒，简化值）
const ROTATION_SPEEDS: Record<string, number> = {
  mercury: 0.000000124, // 约 58.6 天/转
  venus: -0.000000116,  // 约 243 天/转（逆行，负值表示反向旋转）
  earth: 0.0000727,     // 约 24 小时/转
  mars: 0.0000709,      // 约 24.6 小时/转
  jupiter: 0.000175,    // 约 9.9 小时/转
  saturn: 0.000164,     // 约 10.7 小时/转
  uranus: 0.000101,     // 约 17.2 小时/转
  neptune: 0.000108,    // 约 16.1 小时/转
  sun: 0.000000725,     // 约 27 天/转
};

// 标签配置（字体粗细通过 CSS 变量可调）
const LABEL_CONFIG = {
  // 🔧 行星标签相对于标记圈中心的X轴偏移（像素，右侧）
  offsetX: 25,
  
  // 🔧 行星标签相对于标记圈中心的Y轴偏移（像素，上方）
  offsetY: -8,
  
  // 🔧 太阳标签在太阳上方的像素偏移（CSS 像素，而不是 3D 空间单位）
  sunOffsetY: -20,
  
  // 🔧 字体大小
  fontSize: '16px',
  
  // 🔧 字体族（全站统一使用无衬线字体）
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, "Noto Sans SC", "Microsoft YaHei", sans-serif',
  
  // 🔧 字体粗细（行星/太阳标签字重，可在 globals.css 中调整）
  fontWeight: 'var(--font-weight-label)',
  
  // 🔧 渐隐速度（0-1，值越大变化越快）
  fadeSpeed: 0.2,
  
  // 🔧 最小缩放级别（低于此值不显示任何标签，除了选中的）
  minZoomToShow: 10,
};

// 🔧 相机初始角度配置（度）
// 注意：
// - 上下角度（polarAngle）：0度 = 俯视（垂直于轨道平面），90度 = 水平视角，180度 = 仰视
// - 左右角度（azimuthalAngle）：0度 = 正前方，90度 = 右侧，-90度 = 左侧，180度/-180度 = 正后方
const CAMERA_ANGLE_CONFIG = {
  initialPolarAngle: 90,
  
  // 🔧 初始左右角度（度）：页面加载时的相机左右角度，0度 = 正前方
  initialAzimuthalAngle: 90,
  
  // 🔧 过渡目标上下角度（度）：从初始角度平滑过渡到的上下角度，45度 = 从俯视倾斜45度
  targetPolarAngle: 160,
  
  // 🔧 过渡目标左右角度（度）：从初始角度平滑过渡到的左右角度，0度 = 保持正前方
  targetAzimuthalAngle: 0,
  
  // 🔧 过渡延迟时间（毫秒）：页面加载后多久开始角度过渡
  transitionDelay: 500,
  
  // 🔧 是否启用平滑过渡（true = 平滑过渡，false = 立即切换）
  smoothTransition: true,
};

// 太阳光与轨道点数配置已集中到 `src/lib/config/visualConfig.ts`

/**
 * 初始化宇宙尺度渲染器
 * 异步加载真实天文数据并设置到 SceneManager
 */
async function initializeUniverseRenderers(sceneManager: SceneManager) {
  try {
    const dataLoader = (await import('@/lib/data/UniverseDataLoader')).UniverseDataLoader.getInstance();
    
    // 1. 本星系群 - 从真实数据加载
    try {
      const localGroupBuffer = await dataLoader.loadDataForScale(UniverseScale.LocalGroup);
      const localGroupGalaxies = dataLoader.parseLocalGroupData(localGroupBuffer);
      
      const localGroupRenderer = new LocalGroupRenderer();
      await localGroupRenderer.loadData(localGroupGalaxies);
      
      // 初始化标签管理器
      const camera = sceneManager.getCamera();
      const canvas = sceneManager.getRenderer().domElement;
      localGroupRenderer.initLabelManager(camera, canvas);
      
      sceneManager.setLocalGroupRenderer(localGroupRenderer);
      console.log('LocalGroupRenderer initialized with', localGroupGalaxies.length, 'galaxies');
    } catch (error) {
      console.warn('Failed to load LocalGroup data:', error);
    }
    
    // 2. 近邻星系群 - 从真实数据加载
    try {
      const nearbyGroupsBuffer = await dataLoader.loadDataForScale(UniverseScale.NearbyGroups);
      const { groups, galaxies } = dataLoader.parseNearbyGroupsData(nearbyGroupsBuffer);
      
      const nearbyGroupsRenderer = new NearbyGroupsRenderer();
      await nearbyGroupsRenderer.loadData(groups, galaxies);
      
      // 初始化标签管理器
      const camera = sceneManager.getCamera();
      const canvas = sceneManager.getRenderer().domElement;
      nearbyGroupsRenderer.initLabelManager(camera, canvas);
      
      sceneManager.setNearbyGroupsRenderer(nearbyGroupsRenderer);
      console.log('NearbyGroupsRenderer initialized with', groups.length, 'groups and', galaxies.length, 'galaxies');
    } catch (error) {
      console.warn('Failed to load NearbyGroups data:', error);
    }
    
    // 3. 室女座超星系团 - 从真实数据加载
    try {
      const virgoBuffer = await dataLoader.loadDataForScale(UniverseScale.VirgoSupercluster);
      const { clusters, galaxies } = dataLoader.parseVirgoSuperclusterData(virgoBuffer);
      
      const virgoRenderer = new VirgoSuperclusterRenderer();
      await virgoRenderer.loadData(clusters, galaxies);
      
      // 初始化标签管理器
      const camera = sceneManager.getCamera();
      const canvas = sceneManager.getRenderer().domElement;
      virgoRenderer.initLabelManager(camera, canvas);
      
      sceneManager.setVirgoSuperclusterRenderer(virgoRenderer);
      console.log('VirgoSuperclusterRenderer initialized with', clusters.length, 'clusters and', galaxies.length, 'galaxies');
    } catch (error) {
      console.warn('Failed to load VirgoSupercluster data:', error);
    }
    
    // 4. 拉尼亚凯亚超星系团 - 从真实数据加载
    try {
      const laniakeaBuffer = await dataLoader.loadDataForScale(UniverseScale.LaniakeaSupercluster);
      const { superclusters, galaxies } = dataLoader.parseLaniakeaData(laniakeaBuffer);
      
      const laniakeaRenderer = new LaniakeaSuperclusterRenderer();
      await laniakeaRenderer.loadData(superclusters, galaxies);
      
      // 初始化标签管理器
      const camera = sceneManager.getCamera();
      const canvas = sceneManager.getRenderer().domElement;
      laniakeaRenderer.initLabelManager(camera, canvas);
      
      sceneManager.setLaniakeaSuperclusterRenderer(laniakeaRenderer);
      console.log('LaniakeaSuperclusterRenderer initialized with', superclusters.length, 'superclusters and', galaxies.length, 'galaxies');
    } catch (error) {
      console.warn('Failed to load Laniakea data:', error);
    }
    
    
    console.log('Universe renderers initialization complete');
  } catch (error) {
    console.error('Error initializing universe renderers:', error);
    throw error;
  }
}

interface SolarSystemCanvas3DProps {
  onCameraDistanceChange?: (distance: number) => void;
  cesiumEnabled?: boolean;
  onEarthPlanetReady?: (earthPlanet: any) => void;
  onCameraReady?: (camera: any) => void;
  earthLockEnabled?: boolean;
}

export default function SolarSystemCanvas3D({ onCameraDistanceChange, cesiumEnabled = false, onEarthPlanetReady, onCameraReady, earthLockEnabled = false }: SolarSystemCanvas3DProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const cameraControllerRef = useRef<CameraController | null>(null);
  const labelRendererRef = useRef<CSS2DRenderer | null>(null);
  const planetsRef = useRef<Map<string, Planet>>(new Map());
  const orbitsRef = useRef<Map<string, OrbitCurve>>(new Map());
  const labelsRef = useRef<Map<string, OrbitLabel>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const raycasterRef = useRef<Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const satelliteLayerRef = useRef<SatelliteLayer | null>(null);
  // cesiumEnabled ref — 让动画循环（闭包）能读到最新值
  const cesiumEnabledRef = useRef<boolean>(cesiumEnabled);
  // earthLockEnabled ref — 让动画循环能读到最新值
  const earthLockEnabledRef = useRef<boolean>(earthLockEnabled);
  
  // 卫星跟随状态跟踪
  const isTrackingSatelliteRef = useRef<boolean>(false);
  const lastFollowTargetRef = useRef<number | null>(null);
  
  // 标签重叠检测节流：每3帧执行一次（约20fps），减少CPU占用
  const labelUpdateFrameCounterRef = useRef<number>(0);
  const LABEL_UPDATE_INTERVAL = 3;
  
  // 用于触发设置菜单的重新渲染
  const [isCameraControllerReady, setIsCameraControllerReady] = useState(false);
  // 用于控制渐显效果
  const [opacity, setOpacity] = useState(0);
  // 距离地球的距离（AU）
  const [distanceToEarth, setDistanceToEarth] = useState(0);

  // 使用选择器避免不必要的重渲染
  // 3D组件不需要订阅这些状态，因为我们在动画循环中直接使用 getState()
  // 这样可以避免每次状态更新都触发组件重渲染
  // 但初始化时需要获取初始值
  const lang = useSolarSystemStore((state) => state.lang);

  // 监听 cesiumEnabled 变化,动态切换 Cesium 渲染
  React.useEffect(() => {
    // 同步 ref，让动画循环闭包能读到最新值
    cesiumEnabledRef.current = cesiumEnabled;
    // 切换 Three.js 背景透明度（Cesium 模式下透明，让 Cesium 地球从下层透出来）
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setCesiumCompositeMode(cesiumEnabled);
    }

    const earthPlanet = planetsRef.current.get('earth');
    if (earthPlanet && 'setCesiumEnabled' in earthPlanet) {
      console.log(`[SolarSystemCanvas3D] Setting Cesium enabled: ${cesiumEnabled}`);
      
      // 把当前 Three.js 相机传给 setCesiumEnabled，启用时会自动做初始同步
      const camera = cesiumEnabled ? (cameraRef.current as THREE.PerspectiveCamera ?? undefined) : undefined;
      (earthPlanet as any).setCesiumEnabled(cesiumEnabled, camera);
      
      // Cesium 模式下 OrbitControls 保持启用（Three.js 相机驱动 Cesium）
      // 无论启用还是禁用 Cesium，OrbitControls 始终开启
      if (cameraControllerRef.current) {
        const controls = cameraControllerRef.current.getControls();
        controls.enabled = true;
        console.log(`[SolarSystemCanvas3D] OrbitControls always enabled`);
      }
    }
  }, [cesiumEnabled]);

  // 监听 earthLockEnabled 变化，切换地球锁定相机模式
  React.useEffect(() => {
    earthLockEnabledRef.current = earthLockEnabled;
    if (cameraControllerRef.current) {
      cameraControllerRef.current.setEarthLockMode(earthLockEnabled);
    }
  }, [earthLockEnabled]);

  // 初始化场景 - 使用 useLayoutEffect 确保 DOM 准备好
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    // 确保容器有尺寸
    let checkAndInitFrameId: number | null = null;
    let isInitialized = false; // 防止重复初始化
    
    const checkAndInit = () => {
      if (!containerRef.current || isInitialized) return;
      if (containerRef.current.clientWidth === 0 || containerRef.current.clientHeight === 0) {
        checkAndInitFrameId = requestAnimationFrame(checkAndInit);
        return;
      }
      
      // Wait for celestial bodies to load
      const currentState = useSolarSystemStore.getState();
      if (currentState.celestialBodies.length === 0) {
        console.log('Waiting for celestial bodies to load...');
        checkAndInitFrameId = requestAnimationFrame(checkAndInit);
        return;
      }
      
      console.log(`Initializing scene with ${currentState.celestialBodies.length} celestial bodies`);
      isInitialized = true; // 标记已初始化，防止重复
      
      // 容器有尺寸，开始初始化
      const sceneManager = new SceneManager(containerRef.current);
      sceneManagerRef.current = sceneManager;

      // 初始化宇宙尺度渲染器（异步加载数据）
      initializeUniverseRenderers(sceneManager).catch(error => {
        console.error('Failed to initialize universe renderers:', error);
      });

      // 创建卫星图层
      const satelliteLayer = new SatelliteLayer(sceneManager);
      satelliteLayerRef.current = satelliteLayer;
      console.log('SatelliteLayer initialized');

      const scene = sceneManager.getScene();
      const camera = sceneManager.getCamera();
      cameraRef.current = camera; // 保存相机引用用于标尺
      
      // 通知父组件 camera 已准备好
      if (onCameraReady) {
        onCameraReady(camera);
      }
      
      const renderer = sceneManager.getRenderer();
      
      // 创建 CSS2DRenderer 用于显示标记圈
      // 确保只创建一次，避免重复添加
      if (!labelRendererRef.current) {
        const labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0';
        labelRenderer.domElement.style.left = '0';
        labelRenderer.domElement.style.pointerEvents = 'none';
        labelRenderer.domElement.style.zIndex = '3'; // 标签层在最上面
        containerRef.current.appendChild(labelRenderer.domElement);
        labelRendererRef.current = labelRenderer;
      }

      // 创建相机控制器（不要手动设置 camera.position，让 OrbitControls 控制）
      const cameraController = new CameraController(camera, renderer.domElement);
      cameraControllerRef.current = cameraController;
      
      // 设置相机控制器的目标点（使用 controls API，不要直接设置 camera.position）
      const controls = cameraController.getControls();
      controls.target.set(0, 0, 0);
      
      // 设置初始相机位置（通过 OrbitControls 控制）
      // 先设置一个合理的距离，让 OrbitControls 自动计算位置
      const initialDistance = 30;
      camera.position.set(0, initialDistance, 0);
      controls.update();

      
      
      // 设置初始相机角度（使用配置中的角度）
      cameraController.setPolarAngle(CAMERA_ANGLE_CONFIG.initialPolarAngle, false);
      cameraController.setAzimuthalAngle(CAMERA_ANGLE_CONFIG.initialAzimuthalAngle, false);
      /*
      // 延迟后平滑过渡到目标角度
      setTimeout(() => {
        if (cameraControllerRef.current) {
          cameraControllerRef.current.setPolarAngle(
            CAMERA_ANGLE_CONFIG.targetPolarAngle,
            CAMERA_ANGLE_CONFIG.smoothTransition
          );
          cameraControllerRef.current.setAzimuthalAngle(
            CAMERA_ANGLE_CONFIG.targetAzimuthalAngle,
            CAMERA_ANGLE_CONFIG.smoothTransition
          );
        }
      }, CAMERA_ANGLE_CONFIG.transitionDelay);
      */


      // 触发设置菜单的重新渲染
      setIsCameraControllerReady(true);
      
      // 渐显效果
      setTimeout(() => {
        setOpacity(1);
      }, 100);
      
      controls.enabled = true;

      // 添加点光源（太阳光）- 使用顶部的 SUN_LIGHT_CONFIG 可快速调整
      const sunLight = new THREE.PointLight(
        SUN_LIGHT_CONFIG.color,
        SUN_LIGHT_CONFIG.intensity,
        SUN_LIGHT_CONFIG.distance,
        SUN_LIGHT_CONFIG.decay
      );
      sunLight.position.set(0, 0, 0);
      sunLight.castShadow = !!SUN_LIGHT_CONFIG.castShadow;
      if (SUN_LIGHT_CONFIG.castShadow && sunLight.shadow) {
        sunLight.shadow.mapSize.width = SUN_LIGHT_CONFIG.shadowMapSize;
        sunLight.shadow.mapSize.height = SUN_LIGHT_CONFIG.shadowMapSize;
        sunLight.shadow.bias = -0.0001;
      }
      scene.add(sunLight);
      
      // 移除环境光 - 使用自定义着色器实现真实光照
      // 环境光会导致背阳面也被照亮，不符合真实物理效果
      // const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
      // scene.add(ambientLight);

      // 初始化行星和轨道
      // 从 store 获取初始值，而不是订阅它们
      const initialState = useSolarSystemStore.getState();
      const julianDay = dateToJulianDay(initialState.currentTime);
      const elementsMap = ORBITAL_ELEMENTS;

      // 创建太阳
      const sunBody = initialState.celestialBodies.find((b: any) => b.isSun);
      if (sunBody) {
        const sunConfig = CELESTIAL_BODIES.sun;
        const sunPlanet = new Planet({
          body: sunBody,
          ...(sunConfig && { config: sunConfig }),
          rotationSpeed: ROTATION_SPEEDS.sun || 0, // Fallback to old system
        });
        const sunMesh = sunPlanet.getMesh();
        sunMesh.position.set(0, 0, 0);
        sunMesh.userData.isSun = true; // 标记为太阳
        scene.add(sunMesh);
        planetsRef.current.set('sun', sunPlanet);
        

      }

      // 创建行星和轨道（含卫星）
      initialState.celestialBodies.forEach((body: any) => {
        if (body.isSun) return;

        // 卫星（有 parent 字段）与行星采用统一的 Planet 类来渲染
        const isSatellite = !!body.parent;

        // 创建天体（行星或卫星）
        const bodyKey = body.name.toLowerCase();
        const celestialConfig = CELESTIAL_BODIES[bodyKey];
        
        // 如果是地球,使用 EarthPlanet 启用 Cesium 集成
        const planet = bodyKey === 'earth' 
          ? new EarthPlanet({
              body,
              ...(celestialConfig && { config: celestialConfig }),
              rotationSpeed: ROTATION_SPEEDS[bodyKey] || 0,
              // 始终创建 Cesium 扩展,但默认禁用
              enableCesiumTiles: true,
              // Cesium 配置
              cesiumConfig: {
                cesiumContainerId: 'cesium-earth-canvas',
                // 挂载到 Three.js canvas 的父容器，确保在同一 stacking context 内
                // 这样 z-index 才能正确工作，UI 元素不会被 Cesium canvas 遮挡
                parentElement: containerRef.current ?? undefined,
                canvasResolutionScale: 1.0,
                maximumScreenSpaceError: 2,
                maximumNumberOfLoadedTiles: 1000,
              },
              // 距离阈值 - 不再使用,Cesium 在所有距离都可用
              cesiumVisibleDistance: 2000,
              transitionStartDistance: 1800,
              transitionEndDistance: 2500,
            })
          : new Planet({
              body,
              ...(celestialConfig && { config: celestialConfig }),
              rotationSpeed: ROTATION_SPEEDS[bodyKey] || 0,
            });
        planet.updatePosition(body.x, body.y, body.z);
        const planetMesh = planet.getMesh();
        scene.add(planetMesh);
        // 暴露真实半径，供相机约束或其他逻辑使用（单位：AU）
        (planetMesh as any).userData = (planetMesh as any).userData || {};
        (planetMesh as any).userData.radius = planet.getRealRadius();
        planetsRef.current.set(body.name.toLowerCase(), planet);
        
        // 如果是地球,注册到 SceneManager 并设置初始状态
        if (bodyKey === 'earth' && sceneManagerRef.current) {
          sceneManagerRef.current.setEarthPlanet(planet);
          
          // 通知父组件 earthPlanet 已准备好
          if (onEarthPlanetReady) {
            onEarthPlanetReady(planet);
          }
          
          // 设置初始 Cesium 状态(默认禁用)
          if ('setCesiumEnabled' in planet) {
            (planet as any).setCesiumEnabled(cesiumEnabled);
          }
        }

        // 异步加载并应用贴图（Render Layer only - 不影响物理计算）
        // 所有行星都需要加载纹理作为 fallback
        const textureManager = TextureManager.getInstance();
        textureManager.getTexture(bodyKey).then((texture) => {
          if (texture && !planet.getIsSun()) {
            planet.applyTexture(texture, bodyKey);
          }
        });
        
        // 加载夜间贴图（用于昼夜渐变效果）
        textureManager.getNightTexture(bodyKey).then((nightTexture) => {
          if (nightTexture) {
            planet.applyNightTexture(nightTexture);
          }
        });

        // 创建标记圈（2D）
        planet.createMarkerCircle();

        // 创建轨道
        if (isSatellite) {
          // 查找卫星定义以获取轨道半径、颜色、倾角和升交点黄经
          const parentKey = body.parent as string;
          const defs = SATELLITE_DEFINITIONS[parentKey];
          const def = defs ? defs.find((s) => s.name === body.name) : null;
          
          // Always render satellite orbit (circular approximation)
          // Even if using ephemeris data, the circular orbit provides a useful reference
          const orbitRadius = def ? def.a : 0.001;
          const orbitColor = def ? def.color : body.color;
          const inclination = def ? def.i : 0;
          const Omega = def ? def.Omega : 0;
          const eclipticOrbit = def ? def.eclipticOrbit || false : false;
          const orbit = new SatelliteOrbit(orbitRadius, orbitColor, 128, inclination, Omega, parentKey, eclipticOrbit);
          scene.add(orbit.getLine());
          orbitsRef.current.set(body.name.toLowerCase(), orbit as unknown as OrbitCurve);
        } else {
          const elements = elementsMap[body.name.toLowerCase() as keyof typeof elementsMap];
          if (!elements) return;

          const orbitColor = ORBIT_COLORS[body.name.toLowerCase()] || body.color;
          const planetPosition = new THREE.Vector3(body.x, body.y, body.z);
          const orbit = new OrbitCurve(elements, orbitColor, ORBIT_CURVE_POINTS, julianDay, planetPosition);
          scene.add(orbit.getLine());
          orbitsRef.current.set(body.name.toLowerCase(), orbit);
        }

        // 创建文字标签（确保每个行星/卫星只创建一个标签）
        // 标签贴合在轨道圆盘上
        if (!labelsRef.current.has(body.name.toLowerCase())) {
          const labelTextEn = planetNames.en?.[body.name] || body.name;
          const labelTextZh = planetNames.zh?.[body.name] || body.name;
          
          // 获取行星颜色并调亮
          const baseColor = new THREE.Color(body.color);
          // 将颜色转换为HSL，增加亮度
          const hsl = { h: 0, s: 0, l: 0 };
          baseColor.getHSL(hsl);
          // 增加亮度（最多到0.9）
          hsl.l = Math.min(hsl.l + 0.3, 0.9);
          const brighterColor = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
          const colorString = '#' + brighterColor.getHexString();
          
          // 获取轨道半径（半长轴）
          let orbitRadius = 1.0; // 默认值
          
          if (body.isSatellite) {
            // 卫星使用其轨道半径
            const parentKey = body.parent as string;
            const defs = SATELLITE_DEFINITIONS[parentKey];
            const def = defs ? defs.find((s) => s.name === body.name) : null;
            orbitRadius = def ? def.a : 0.01;
          } else {
            // 行星使用轨道元素的半长轴
            const elements = elementsMap[body.name.toLowerCase() as keyof typeof elementsMap];
            orbitRadius = elements ? elements.a : 1.0;
          }
          
          // 计算轨道间距（圆环宽度）
          // 从太阳到当前行星的连线上，当前行星到内侧轨道交点的距离
          let orbitSpacing = orbitRadius * 0.3; // 默认间距（30%）
          
          if (!body.isSatellite) {
            // 行星顺序：水星、金星、地球、火星、木星、土星、天王星、海王星
            const planetOrder = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
            const currentIndex = planetOrder.indexOf(body.name.toLowerCase());
            
            if (currentIndex > 0) {
              // 获取上一个行星的轨道半径
              const prevPlanetName = planetOrder[currentIndex - 1];
              const prevElements = elementsMap[prevPlanetName as keyof typeof elementsMap];
              if (prevElements) {
                // 圆环宽度 = 当前轨道半径 - 上一个轨道半径
                orbitSpacing = orbitRadius - prevElements.a;
              }
            } else if (currentIndex === 0) {
              // 水星：到太阳的距离
              orbitSpacing = orbitRadius;
            }
          } else {
            // 卫星间距使用轨道半径的 30%
            orbitSpacing = orbitRadius * 0.3;
          }
          
          const label = new OrbitLabel({
            textEn: labelTextEn,
            textZh: labelTextZh,
            color: colorString,
            orbitRadius: orbitRadius,
            orbitSpacing: orbitSpacing,
          });
          
          // 将标签添加到场景
          scene.add(label.getSprite());
          labelsRef.current.set(body.name.toLowerCase(), label);
        }
      });

      // 动画循环
      const animate = () => {
        const now = Date.now();
        const deltaTime = Math.min((now - lastTimeRef.current) / 1000, 0.1);
        lastTimeRef.current = now;

        const state = useSolarSystemStore.getState();
        
        // 如果正在播放，更新时间和天体位置
        if (state.isPlaying && deltaTime > 0) {
          state.tick(deltaTime);
        }
        
        // 获取最新的天体数据（tick 会更新 celestialBodies）
        const currentState = useSolarSystemStore.getState();
        const currentBodies = currentState.celestialBodies;

        // 太阳位置（用于光照计算）
        const sunPosition = new THREE.Vector3(0, 0, 0);
        
        // 更新行星位置、自转和 LOD
        currentBodies.forEach((body: any) => {
          const key = body.name.toLowerCase();
          const planet = planetsRef.current.get(key);
          if (planet) {
            planet.updatePosition(body.x, body.y, body.z);
            
            // 更新太阳位置（用于光照计算）
            planet.updateSunPosition(sunPosition);
            
            // 更新星球自转 - 使用当前时间和时间速度
            const currentTimeInDays = dateToJulianDay(currentState.currentTime) - 2451545.0; // Days since J2000.0
            
            // 地球锁定模式：记录自转前的四元数，自转后计算 delta 并旋转相机
            if (key === 'earth' && earthLockEnabledRef.current && cameraControllerRef.current) {
              const quatBefore = planet.getRotationQuaternion();
              planet.updateRotation(currentTimeInDays, currentState.timeSpeed);
              const quatAfter = planet.getRotationQuaternion();
              
              // delta = quatAfter * inverse(quatBefore)
              const deltaQ = quatAfter.clone().multiply(quatBefore.clone().invert());
              const earthPos = planet.getMesh().position.clone();
              cameraControllerRef.current.applyEarthLockDelta(deltaQ, earthPos);
            } else {
              planet.updateRotation(currentTimeInDays, currentState.timeSpeed);
            }
            
            // 计算相机到星球的距离并更新 LOD
            const planetWorldPos = new THREE.Vector3(body.x, body.y, body.z);
            const cameraPos = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
            const distance = planetWorldPos.distanceTo(cameraPos);
            planet.updateLOD(distance);
            
            // 更新网格可见性
            planet.updateGridVisibility(distance);
            
            // 更新轨道渐变和自适应分辨率（如果轨道存在）
            const orbit = orbitsRef.current.get(key);
            if (orbit) {
              const planetPosition = new THREE.Vector3(body.x, body.y, body.z);
              orbit.updatePlanetPosition(planetPosition);
              
              // Update adaptive orbit curve resolution based on camera distance
              const orbitCenterDistance = cameraPos.distanceTo(planetPosition);
              if (orbit.updateCurveResolution) {
                orbit.updateCurveResolution(orbitCenterDistance);
              }
            }
          }
        });

        // 播放时的相机跟踪逻辑：同时更新相机和目标点位置，保持相对偏移
        // 这样在播放时，行星始终保持在屏幕中心，且视角不会被锁定
        // 注意：必须在计算轨道透明度之前更新相机位置，否则快速转动时轨道隐藏会失效
        if (state.isPlaying && state.selectedPlanet) {
          const selectedBody = currentBodies.find((b: any) => b.name === state.selectedPlanet);
          if (selectedBody && cameraControllerRef.current) {
            const controls = cameraControllerRef.current.getControls();
            const targetPos = new THREE.Vector3(selectedBody.x, selectedBody.y, selectedBody.z);
            
            // 计算相机相对于当前目标的偏移向量（保持距离和方向）
            const cameraOffset = new THREE.Vector3()
              .subVectors(camera.position, controls.target);
            
            // 同时更新目标和相机位置，保持相对关系
            controls.target.copy(targetPos);
            camera.position.copy(targetPos).add(cameraOffset);
            controls.update();
          }
        }
        
        // 播放时降低阻尼因子获得更敏锐的相机响应，非播放时使用配置值
        if (cameraControllerRef.current) {
          const controls = cameraControllerRef.current.getControls();
          // 播放时使用较低的阻尼以获得敏捷的跟踪
          // 非播放时使用配置文件中的阻尼值以保留平滑的交互感
          controls.dampingFactor = state.isPlaying ? 0.02 : CAMERA_CONFIG.dampingFactor;
        }

        // 卫星相机跟随逻辑：监听Store中的cameraFollowTarget状态
        const satelliteStore = useSatelliteStore.getState();
        const followTarget = satelliteStore.cameraFollowTarget;
        
        if (followTarget && cameraControllerRef.current && satelliteLayerRef.current) {
          // 获取卫星的实时状态
          const satelliteState = satelliteStore.satellites.get(followTarget);
          
          if (satelliteState) {
            // 检查是否是新的跟随目标
            const isNewTarget = lastFollowTargetRef.current !== followTarget;
            
            if (isNewTarget) {
              // 创建跟踪函数,用于获取卫星的实时位置
              const trackingTargetGetter = () => {
                const currentState = useSatelliteStore.getState().satellites.get(followTarget);
                if (currentState) {
                  return new THREE.Vector3(
                    currentState.position.x,
                    currentState.position.y,
                    currentState.position.z
                  );
                }
                // 如果找不到卫星,返回当前位置
                return new THREE.Vector3(
                  satelliteState.position.x,
                  satelliteState.position.y,
                  satelliteState.position.z
                );
              };
              
              // 获取TLE数据以确定卫星类型
              const tleData = satelliteStore.tleData.get(followTarget);
              const satelliteRadius = 0.0001; // 卫星半径很小,约100km转换为AU
              
              const celestialObject = {
                name: tleData?.name || `Satellite ${followTarget}`,
                radius: satelliteRadius,
                type: 'satellite' as const
              };
              
              const targetPosition = new THREE.Vector3(
                satelliteState.position.x,
                satelliteState.position.y,
                satelliteState.position.z
              );
              
              // 使用CameraController的focusOnTarget方法
              cameraControllerRef.current.focusOnTarget(
                targetPosition,
                celestialObject,
                trackingTargetGetter,
                { distance: 0.001 } // 卫星跟随距离较近
              );
              
              // 更新跟踪状态
              isTrackingSatelliteRef.current = true;
              lastFollowTargetRef.current = followTarget;
            }
          }
        } else {
          // 如果没有跟随目标,重置跟踪标记
          if (isTrackingSatelliteRef.current) {
            isTrackingSatelliteRef.current = false;
            lastFollowTargetRef.current = null;
          }
        }

        // 计算相机到最近行星的距离，用于所有轨道的渐隐
        // 注意：此计算必须在相机跟踪逻辑之后，确保使用更新后的相机位置
        let minDistanceToAnyPlanet = Infinity;
        currentBodies.forEach((body: any) => {
          if (body.isSun) return;
          const planetPos = new THREE.Vector3(body.x, body.y, body.z);
          const dist = camera.position.distanceTo(planetPos);
          if (dist < minDistanceToAnyPlanet) {
            minDistanceToAnyPlanet = dist;
          }
        });

        // 根据最近距离计算圆盘和线条的透明度
        let discOpacity = 1.0;
        let lineOpacity = 1.0;
        if (ORBIT_FADE_CONFIG.enabled) {
          const cfg = ORBIT_FADE_CONFIG;
          let t = 1.0;
          if (minDistanceToAnyPlanet <= cfg.fadeEndDistance) {
            t = 0;
          } else if (minDistanceToAnyPlanet < cfg.fadeStartDistance) {
            const range = cfg.fadeStartDistance - cfg.fadeEndDistance;
            t = (minDistanceToAnyPlanet - cfg.fadeEndDistance) / range;
          }
          const discMin = (cfg as any).discMinOpacity ?? 0;
          const lineMin = (cfg as any).lineMinOpacity ?? 0;
          discOpacity = discMin + t * (1.0 - discMin);
          lineOpacity = lineMin + t * (1.0 - lineMin);
        }

        // ==================== 远距离视图逻辑 ====================
        // 计算相机到太阳系中心（太阳）的距离
        const distanceToSun = camera.position.length();
        
        // 更新全局状态中的相机距离
        useSolarSystemStore.getState().setCameraDistance(distanceToSun);
        
        // 计算远距离时的行星、轨道、标签透明度
        let farViewPlanetOpacity = 1.0;
        let farViewOrbitOpacity = 1.0;
        // let farViewLabelOpacity = 1.0; // TODO: Apply this to labels
        
        if (FAR_VIEW_CONFIG.enabled) {
          // 行星淡出
          if (distanceToSun >= FAR_VIEW_CONFIG.planetFadeEndDistance) {
            farViewPlanetOpacity = 0;
          } else if (distanceToSun > FAR_VIEW_CONFIG.planetFadeStartDistance) {
            const range = FAR_VIEW_CONFIG.planetFadeEndDistance - FAR_VIEW_CONFIG.planetFadeStartDistance;
            farViewPlanetOpacity = 1 - (distanceToSun - FAR_VIEW_CONFIG.planetFadeStartDistance) / range;
          }
          
          // 轨道淡出
          if (distanceToSun >= FAR_VIEW_CONFIG.orbitFadeEndDistance) {
            farViewOrbitOpacity = 0;
          } else if (distanceToSun > FAR_VIEW_CONFIG.orbitFadeStartDistance) {
            const range = FAR_VIEW_CONFIG.orbitFadeEndDistance - FAR_VIEW_CONFIG.orbitFadeStartDistance;
            farViewOrbitOpacity = 1 - (distanceToSun - FAR_VIEW_CONFIG.orbitFadeStartDistance) / range;
          }
          
          // 标签淡出 - TODO: Apply farViewLabelOpacity to labels
          // if (distanceToSun >= FAR_VIEW_CONFIG.labelFadeEndDistance) {
          //   farViewLabelOpacity = 0;
          // } else if (distanceToSun > FAR_VIEW_CONFIG.labelFadeStartDistance) {
          //   const range = FAR_VIEW_CONFIG.labelFadeEndDistance - FAR_VIEW_CONFIG.labelFadeStartDistance;
          //   farViewLabelOpacity = 1 - (distanceToSun - FAR_VIEW_CONFIG.labelFadeStartDistance) / range;
          // }
        }
        
        // 合并远距离透明度到轨道透明度
        discOpacity *= farViewOrbitOpacity;
        lineOpacity *= farViewOrbitOpacity;

        // 应用透明度到所有行星轨道
        orbitsRef.current.forEach((orbit) => {
          if (orbit && orbit.setOpacity) {
            orbit.setOpacity(discOpacity, lineOpacity);
          }
        });
        
        // 应用远距离行星透明度（太阳除外）
        if (FAR_VIEW_CONFIG.enabled && farViewPlanetOpacity < 1) {
          currentBodies.forEach((body: any) => {
            if (body.isSun) return; // 太阳不隐藏
            const key = body.name.toLowerCase();
            const planet = planetsRef.current.get(key);
            if (planet) {
              const mesh = planet.getMesh();
              // 设置行星网格的可见性
              mesh.visible = farViewPlanetOpacity > 0.01;
              // 如果材质支持透明度，也可以设置
              if ('material' in mesh && mesh.material && 'opacity' in mesh.material) {
                (mesh.material as any).opacity = farViewPlanetOpacity;
                (mesh.material as any).transparent = farViewPlanetOpacity < 1;
              }
            }
          });
        } else {
          // 恢复行星可见性（太阳除外）
          // 注意：EarthPlanet 在 Cesium 启用时会自己管理 mesh.visible，不要覆盖它
          currentBodies.forEach((body: any) => {
            if (body.isSun) return; // 太阳不处理
            const key = body.name.toLowerCase();
            const planet = planetsRef.current.get(key);
            if (planet) {
              // 如果是 EarthPlanet 且 Cesium 已启用，跳过（由 EarthPlanet 自己管理可见性）
              if (key === 'earth' && cesiumEnabledRef.current) return;
              const mesh = planet.getMesh();
              mesh.visible = true;
            }
          });
        }

        // 太阳始终保持可见和正确的材质状态（不受远距离优化影响）
        const sunPlanet = planetsRef.current.get('sun');
        if (sunPlanet) {
          const sunMesh = sunPlanet.getMesh();
          sunMesh.visible = true;
          // 确保太阳材质属性始终正确
          if ('material' in sunMesh && sunMesh.material) {
            const material = sunMesh.material as any;
            material.transparent = false;
            material.opacity = 1.0;
            material.depthWrite = true;
            material.depthTest = true;
          }
        }

        // 更新太阳位置和状态
        if (sunPlanet) {
          sunPlanet.updatePosition(0, 0, 0);
          sunPlanet.updateRotation(deltaTime);
          
          // 计算相机到太阳的距离并更新 LOD
          const sunWorldPos = new THREE.Vector3(0, 0, 0);
          const cameraPos = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
          const sunDistance = sunWorldPos.distanceTo(cameraPos);
          sunPlanet.updateLOD(sunDistance);
          
          // 更新网格可见性（太阳通常不显示网格，但保持一致性）
          sunPlanet.updateGridVisibility(sunDistance);
          
          // 太阳标签始终显示（不参与重叠检测）
          const sunLabel = labelsRef.current.get('sun');
          if (sunLabel) {
            sunLabel.setOpacity(1);
          }
          
          // 每帧更新太阳的屏幕空间光晕（如果 Planet 实例提供该方法）
          try {
            // @ts-ignore - updateGlow 可能未在类型定义中声明
            sunPlanet.updateGlow(camera);
          } catch (err) {
            // 忽略错误，保持渲染循环稳定
          }
        }
        
        // 更新 EarthPlanet（Cesium 集成）
        if (sceneManagerRef.current) {
          sceneManagerRef.current.updateEarthPlanet(deltaTime);
        }

        // 更新天空盒/星空位置（固定在相机空间）
        // 优化：直接调用 SceneManager 的方法，避免每帧遍历整个场景树
        if (sceneManagerRef.current) {
          sceneManagerRef.current.updateSkyboxPosition(camera.position);
        }
        
        // 更新相机控制器（必须在渲染前调用，以应用阻尼效果）
        if (cameraControllerRef.current) {
          cameraControllerRef.current.update(deltaTime);
        }

        // 计算相机到地球的距离（用于左上角显示）
        const earthBody = currentBodies.find((b: any) => b.name.toLowerCase() === 'earth');
        if (earthBody) {
          const earthPos = new THREE.Vector3(earthBody.x, earthBody.y, earthBody.z);
          const cameraPos = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
          const distToEarth = cameraPos.distanceTo(earthPos);
          setDistanceToEarth(distToEarth);
        }

        // 动态调整视距裁剪
        const cameraDistance = Math.sqrt(
          Math.pow(camera.position.x, 2) +
          Math.pow(camera.position.y, 2) +
          Math.pow(camera.position.z, 2)
        );
        const maxDistance = Math.max(cameraDistance * 3, 50);
        // 动态调整 near/far，保持 near:far 比值合理（深度缓冲精度）
        // 关键原则：near/far 比值不能太小，否则深度缓冲精度不足导致 z-fighting
        if (earthBody) {
          const earthPos = new THREE.Vector3(earthBody.x, earthBody.y, earthBody.z);
          const EARTH_RADIUS_AU = 0.0000426;
          const distToCenter = camera.position.distanceTo(earthPos);
          const distToSurface = Math.max(distToCenter - EARTH_RADIUS_AU, 1e-12);

          let near: number;
          let far: number;

          if (distToSurface < 0.1) {
            // 靠近地球：near 基于到中心距离而非表面距离
            // 这样 near 平面不会切入球体三角面（球体顶点到中心距离 = 半径）
            near = Math.max(distToCenter * 0.0001, 1e-9);
            // far 必须足够大以覆盖整个地球（直径约 0.0000852 AU）
            // 同时也要覆盖到太阳系范围（卫星轨道等）
            far = Math.max(maxDistance, EARTH_RADIUS_AU * 100, 1e6);
          } else {
            // 远离地球：使用固定值，保证卫星/银河系正常显示
            near = 0.01;
            far = Math.max(maxDistance, 1e6);
          }

          camera.near = near;
          camera.far = far;
          camera.updateProjectionMatrix();
        } else {
          sceneManager.updateCameraClipping(0.01, maxDistance);
        }
        
        // 1. 每帧更新标签位置（不节流，保证流畅移动）
        currentBodies.forEach((body: any) => {
          const key = body.name.toLowerCase();
          const label = labelsRef.current.get(key);
          
          // 更新 OrbitLabel 的位置
          if (label) {
            // 对于卫星，使用跟随模式（传入卫星自己的位置）
            // 对于行星，使用固定模式（传入行星位置，但内部会固定在轨道下方）
            const centerPosition = new THREE.Vector3(body.x, body.y, body.z);
            
            const orbit = orbitsRef.current.get(key);
            
            // 获取轨道法向量（如果有轨道且方法存在）
            let orbitNormal = new THREE.Vector3(0, 0, 1); // 默认法向量
            if (orbit && typeof orbit.getOrbitNormal === 'function') {
              orbitNormal = orbit.getOrbitNormal();
            }
            
            // 更新标签位置，传入相机以支持自动翻转
            // 传入 isSatellite 标志
            label.updatePositionWithCamera(centerPosition, orbitNormal, camera, body.isSatellite || false);
          }
        });
        
        // 2. 标签重叠检测节流：每N帧执行一次，大幅减少CPU占用
        labelUpdateFrameCounterRef.current++;
        const shouldUpdateLabels = labelUpdateFrameCounterRef.current >= LABEL_UPDATE_INTERVAL;
        if (shouldUpdateLabels) {
          labelUpdateFrameCounterRef.current = 0;
        }
        
        // 3. 重叠检测和标记圈/标签显示逻辑（类似2D版本）
        // 收集所有标签信息（屏幕坐标）
        const labelInfos: Array<{
          body: any;
          planet: Planet;
          label: any;
          screenX: number;
          screenY: number;
          text: string;
          isSelected: boolean;
          priority: number;
        }> = [];
        
        // 只在需要更新标签时才收集信息和执行重叠检测
        if (shouldUpdateLabels) {
          currentBodies.forEach((body: any) => {
          // 太阳也显示标签
          const key = body.name.toLowerCase();
          const planet = planetsRef.current.get(key);
          const label = labelsRef.current.get(key);
          
          // 跳过不可见的卫星（不在重叠检测中考虑它们）
          if (body.isSatellite) {
            const parentKey = body.parent as string;
            const parentPlanet = planetsRef.current.get(parentKey.toLowerCase());
            if (!parentPlanet) return;
            const parentPos = new THREE.Vector3();
            parentPlanet.getMesh().getWorldPosition(parentPos);
            const cameraPosVec = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
            const distanceToParent = cameraPosVec.distanceTo(parentPos);
            // 卫星不可见时，跳过重叠检测
            if (distanceToParent >= SATELLITE_CONFIG.visibilityThreshold) {
              return;
            }
          }
          
          // 只要有 planet 就收集信息（即使没有 label）
          if (planet) {
            // 将3D位置转换为屏幕坐标
            const worldPos = new THREE.Vector3(body.x, body.y, body.z);
            worldPos.project(camera);
            
            // 安全检查 containerRef.current
            if (!containerRef.current) return;
            
            const screenX = (worldPos.x * 0.5 + 0.5) * containerRef.current.clientWidth;
            const screenY = (worldPos.y * -0.5 + 0.5) * containerRef.current.clientHeight;
            
            const selectedPlanet = useSolarSystemStore.getState().selectedPlanet;
            const isSelected = body.name === selectedPlanet;
            const displayName = planetNames[lang]?.[body.name] || body.name;
            
            labelInfos.push({
              body,
              planet,
              label: label || null,
              screenX,
              screenY,
              text: displayName,
              isSelected,
              priority: 1, // Planets have highest priority
            });
          }
        });
        
        // 2. 检测重叠并设置目标透明度
        // 获取选中状态
        const selectedPlanet = useSolarSystemStore.getState().selectedPlanet;
        
        // 2.1 处理行星标签重叠
        for (let i = 0; i < labelInfos.length; i++) {
          const info1 = labelInfos[i];
          if (!info1) continue;
          const isSelected = info1.body.name === selectedPlanet;
          
          // 太阳标签始终显示，不参与重叠检测
          if (info1.body.isSun) {
            if (info1.planet) {
              info1.planet.setMarkerTargetOpacity(1.0);
            }
            continue;
          }
          
          if (isSelected) {
            info1.planet.setMarkerTargetOpacity(1.0);
            continue;
          }
          
          let hasOverlap = false;
          // 检查与所有其他行星标签的重叠
          for (let j = 0; j < labelInfos.length; j++) {
            if (i === j) continue;
            const info2 = labelInfos[j];
            if (!info2) continue;
            
            // 简单的重叠检测（基于屏幕坐标和标签大小）
            const labelWidth = info1.text.length * 10; // 估算标签宽度
            const labelHeight = 20; // 标签高度
            const markerSize = 20; // 标记圈大小
            const totalWidth = labelWidth + markerSize;
            const distanceX = Math.abs(info1.screenX - info2.screenX);
            const distanceY = Math.abs(info1.screenY - info2.screenY);
            
            if (distanceX < totalWidth && distanceY < labelHeight) {
              // 如果与选中的行星重叠，隐藏当前标签
              const isInfo2Selected = info2.body.name === selectedPlanet;
              if (isInfo2Selected) {
                hasOverlap = true;
                break;
              }
              // 如果两个都未选中，根据距离中心的距离决定隐藏哪个
              const centerX = containerRef.current!.clientWidth / 2;
              const centerY = containerRef.current!.clientHeight / 2;
              const dist1 = Math.sqrt(
                Math.pow(info1.screenX - centerX, 2) + 
                Math.pow(info1.screenY - centerY, 2)
              );
              const dist2 = Math.sqrt(
                Math.pow(info2.screenX - centerX, 2) + 
                Math.pow(info2.screenY - centerY, 2)
              );
              // 距离中心更远的隐藏
              if (dist1 > dist2 || (Math.abs(dist1 - dist2) < 1 && i > j)) {
                hasOverlap = true;
                break;
              }
            }
          }
          
          info1.planet.setMarkerTargetOpacity(hasOverlap ? 0.0 : 1.0);
        }
        
        // 3. 更新所有标记圈和标签的透明度（平滑渐隐）
        labelInfos.forEach((info) => {
          // 太阳标签始终显示，不参与透明度更新
          if (info.body.isSun) {
            if (info.label) {
              info.label.setOpacity(1.0);
            }
            return;
          }
          
          info.planet.updateMarkerOpacity();
          const opacity = info.planet.getMarkerOpacity();
          
          // 更新标签的透明度
          if (info.label) {
            info.label.setOpacity(opacity);
          }
        });
        
        // 4. 确保所有标记圈都被更新（即使没有标签或不在 labelInfos 中）
        currentBodies.forEach((body: any) => {
          if (body.isSun) return;
          const key = body.name.toLowerCase();
          const planet = planetsRef.current.get(key);
          if (planet) {
            // 如果这个行星不在 labelInfos 中，确保标记圈仍然显示
            const inLabelInfos = labelInfos.some(info => info.body.name === body.name);
            if (!inLabelInfos) {
              // 不在 labelInfos 中的行星，标记圈应该显示
              planet.setMarkerTargetOpacity(1.0);
            }
            // 确保标记圈的透明度被更新
            planet.updateMarkerOpacity();
          }
        });
        
        } // 结束标签更新节流块

        // 5. 更新卫星轨道的中心（使卫星轨道跟随母行星位置）并控制卫星可见性
        currentBodies.forEach((body: any) => {
          if (!body.isSatellite) return;
          
          const satelliteKey = body.name.toLowerCase();
          const orbit = orbitsRef.current.get(satelliteKey);
          if (!orbit) return;
          
          const parentKey = body.parent as string;
          const parentPlanet = planetsRef.current.get(parentKey.toLowerCase());
          if (!parentPlanet) return;
          
          const parentPos = new THREE.Vector3();
          parentPlanet.getMesh().getWorldPosition(parentPos);
          const cameraPosVec = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
          const distanceToParent = cameraPosVec.distanceTo(parentPos);
          
          // 计算卫星的可见性（基于相机到母行星的距离）
          const isVisible = distanceToParent < SATELLITE_CONFIG.visibilityThreshold;
          const fadeThreshold = SATELLITE_CONFIG.fadeOutDistance;
          
          // 计算淡出的透明度（从 fadeThreshold 到 visibilityThreshold）
          let satelliteOpacity = 1.0;
          if (distanceToParent > SATELLITE_CONFIG.visibilityThreshold) {
            satelliteOpacity = 0;
          } else if (distanceToParent > (SATELLITE_CONFIG.visibilityThreshold - (fadeThreshold - SATELLITE_CONFIG.visibilityThreshold))) {
            // 在可见阈值附近渐隐
            const fadeRange = fadeThreshold - SATELLITE_CONFIG.visibilityThreshold;
            const fadeDistance = Math.max(0, distanceToParent - (SATELLITE_CONFIG.visibilityThreshold - fadeRange));
            satelliteOpacity = 1 - (fadeDistance / fadeRange);
          }
          
          // 更新卫星网格、轨道、标记圈和标签的可见性
          const satelliteMesh = planetsRef.current.get(satelliteKey)?.getMesh();
          if (satelliteMesh) {
            satelliteMesh.visible = isVisible;
          }
          
          // 更新卫星轨道可见性
          orbit.getLine().visible = isVisible;
          
          // 更新卫星标记圈可见性
          const satellite = planetsRef.current.get(satelliteKey);
          if (satellite) {
            satellite.setMarkerTargetOpacity(isVisible ? satelliteOpacity : 0);
          }
          
          // 更新卫星标签可见性
          const satelliteLabel = labelsRef.current.get(satelliteKey);
          if (satelliteLabel) {
            satelliteLabel.setOpacity(isVisible ? satelliteOpacity : 0);
          }
          
          // 更新轨道中心位置
          try {
            // @ts-ignore
            orbit.updatePlanetPosition(parentPos);
            
            // 注意：轨道朝向在创建时已设置，不需要每帧更新
            // 这避免了轨道持续旋转的问题
          } catch (err) {
            // 忽略错误
          }
        });

        // 更新多尺度宇宙视图（近邻恒星、银河系）
        if (sceneManagerRef.current) {
          sceneManagerRef.current.updateMultiScaleView(distanceToSun, deltaTime);
        }

        // 更新卫星图层
        if (satelliteLayerRef.current) {
          satelliteLayerRef.current.update();
        }

        // 通知父组件相机距离变化
        if (onCameraDistanceChange) {
          onCameraDistanceChange(distanceToSun);
        }

        // 渲染顺序：先更新 controls，再渲染场景
        // 确保 OrbitControls 的 update() 在 render() 之前调用
        // 主渲染器和标签渲染器必须在同一帧同步执行，避免闪烁
        sceneManager.render();
        
        // 渲染标记圈（CSS2DRenderer）
        if (labelRendererRef.current) {
          labelRendererRef.current.render(scene, camera);
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      // 创建射线投射器（用于点击检测）
      raycasterRef.current = new Raycaster();
      
      // 拖动检测变量
      let isDragging = false;
      let mouseDownPosition = { x: 0, y: 0 };
      let mouseDownTime = 0;
      const dragThreshold = 5; // 像素阈值，超过此距离认为是拖动
      const clickTimeThreshold = 300; // 毫秒阈值，超过此时间认为是长按
      
      // 处理鼠标按下（开始拖动检测）
      const handleMouseDown = (event: MouseEvent) => {
        isDragging = false;
        mouseDownPosition.x = event.clientX;
        mouseDownPosition.y = event.clientY;
        mouseDownTime = Date.now();
      };
      
      // 处理鼠标移动（检测拖动和卫星悬停）
      const handleMouseMove = (event: MouseEvent) => {
        // 检测拖动
        if (mouseDownTime > 0) {
          const deltaX = event.clientX - mouseDownPosition.x;
          const deltaY = event.clientY - mouseDownPosition.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          
          if (distance > dragThreshold) {
            isDragging = true;
          }
        }
        
        // 检测卫星悬停(仅在地球视角下启用)
        if (!containerRef.current || !raycasterRef.current || !sceneManagerRef.current) return;
        
        const camera = sceneManagerRef.current.getCamera();
        const currentBodies = useSolarSystemStore.getState().celestialBodies;
        const earthBody = currentBodies.find((b: any) => b.name.toLowerCase() === 'earth');
        
        if (earthBody) {
          const earthPosition = new THREE.Vector3(earthBody.x, earthBody.y, earthBody.z);
          const cameraToEarthDistance = camera.position.distanceTo(earthPosition);
          const earthViewThreshold = 0.01; // AU, 约150万公里
          
          if (cameraToEarthDistance < earthViewThreshold && satelliteLayerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            raycasterRef.current.setFromCamera(mouseRef.current, camera);
            
            const satelliteRenderer = satelliteLayerRef.current.getRenderer();
            const hoveredSatelliteId = satelliteRenderer.raycast(raycasterRef.current, cameraToEarthDistance);
            
            // 更新悬停状态
            useSatelliteStore.getState().setHoveredSatellite(hoveredSatelliteId);
            
            // 更新渲染器的悬停状态
            satelliteRenderer.setHoveredSatellite(hoveredSatelliteId);
          } else {
            // 离开地球视角时清除悬停状态
            useSatelliteStore.getState().setHoveredSatellite(null);
            if (satelliteLayerRef.current) {
              satelliteLayerRef.current.getRenderer().setHoveredSatellite(null);
            }
          }
        } else {
          // 找不到地球时清除悬停状态
          useSatelliteStore.getState().setHoveredSatellite(null);
          if (satelliteLayerRef.current) {
            satelliteLayerRef.current.getRenderer().setHoveredSatellite(null);
          }
        }
      };
      
      // 处理鼠标抬起（重置拖动状态）
      const handleMouseUp = () => {
        // 不立即重置,让click事件先处理
        // isDragging和mouseDownTime会在click事件中使用后自动失效
      };
      
      // 处理鼠标点击（聚焦到行星）
      const handleClick = (event: MouseEvent) => {
        if (!containerRef.current || !raycasterRef.current || !sceneManagerRef.current || !cameraControllerRef.current) return;
        
        // 如果是拖动操作，不执行聚焦
        if (isDragging) {
          // 重置拖动状态
          isDragging = false;
          mouseDownTime = 0;
          return;
        }
        
        // 如果是长按操作，不执行聚焦
        const clickDuration = Date.now() - mouseDownTime;
        if (clickDuration > clickTimeThreshold) {
          // 重置状态
          isDragging = false;
          mouseDownTime = 0;
          return;
        }
        
        const rect = containerRef.current.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const camera = sceneManagerRef.current.getCamera();
        raycasterRef.current.setFromCamera(mouseRef.current, camera);
        
        // 获取当前天体列表
        const currentBodies = useSolarSystemStore.getState().celestialBodies;
        
        // 检测卫星点击(仅在地球视角下启用)
        // 
        // ⚠️ 重要: 距离计算必须使用相机到地球的距离
        // 
        // 错误做法: camera.position.length() - 这是相机到太阳的距离,约1AU
        // 正确做法: camera.position.distanceTo(earthPosition) - 相机到地球的距离
        // 
        // 当聚焦到地球时,相机距离地球很近(约0.0002 AU),但距离太阳仍是1AU。
        // 如果使用到太阳的距离判断,会导致永远无法进入地球视角模式。
        const earthBody = currentBodies.find((b: any) => b.name.toLowerCase() === 'earth');
        
        if (earthBody) {
          const earthPosition = new THREE.Vector3(earthBody.x, earthBody.y, earthBody.z);
          const cameraToEarthDistance = camera.position.distanceTo(earthPosition);
          const earthViewThreshold = 0.01; // AU, 约150万公里
          
          if (cameraToEarthDistance < earthViewThreshold && satelliteLayerRef.current) {
            const satelliteRenderer = satelliteLayerRef.current.getRenderer();
            const clickedSatelliteId = satelliteRenderer.raycast(raycasterRef.current, cameraToEarthDistance);
            
            if (clickedSatelliteId !== null) {
              useSatelliteStore.getState().selectSatellite(clickedSatelliteId);
              
              // 重置拖动检测状态
              isDragging = false;
              mouseDownTime = 0;
              return; // 卫星点击优先,不再检测行星
            }
          }
        }
        
        // 检测所有行星（包括标记圈和标签）
        const intersects: Array<{ planet: Planet; body: any; distance: number; type: 'mesh' | 'marker' | 'label'; isSatellite: boolean }> = [];
        
        // 检测所有天体：行星和卫星
        currentBodies.forEach((body: any) => {
          // 检查是否为卫星
          const isSatellite = Object.values(SATELLITE_DEFINITIONS).some((sats: any) => 
            sats.some((sat: any) => sat.name.toLowerCase() === body.name.toLowerCase())
          ) || body.parentBody;
          
          const key = body.name.toLowerCase();
          const planet = planetsRef.current.get(key);
          if (planet) {
            // 1. 检测行星网格
            const mesh = planet.getMesh();
            const meshIntersect = raycasterRef.current!.intersectObject(mesh);
            if (meshIntersect.length > 0 && meshIntersect[0]) {
              intersects.push({
                planet,
                body,
                distance: meshIntersect[0].distance,
                type: 'mesh',
                isSatellite,
              });
            }
            
            // 2. 检测标记圈（CSS2DObject）- 使用屏幕坐标
            const markerObject = planet.getMarkerObject();
            if (markerObject && containerRef.current) {
              const worldPos = new THREE.Vector3(body.x, body.y, body.z);
              worldPos.project(camera);
              const screenX = (worldPos.x * 0.5 + 0.5) * containerRef.current.clientWidth;
              const screenY = (worldPos.y * -0.5 + 0.5) * containerRef.current.clientHeight;
              
              const clickX = event.clientX - rect.left;
              const clickY = event.clientY - rect.top;
              
              // 标记圈大小（像素）
              const markerSize = 20; // 与 MARKER_CONFIG.size 一致
              const distance = Math.sqrt(
                Math.pow(clickX - screenX, 2) + 
                Math.pow(clickY - screenY, 2)
              );
              
              if (distance <= markerSize / 2) {
                intersects.push({
                  planet,
                  body,
                  distance: 0, // 标记圈点击优先级最高
                  type: 'marker',
                  isSatellite,
                });
              }
            }
            
            // 3. 检测标签（OrbitLabel）- 使用屏幕坐标
            const label = labelsRef.current.get(key);
            if (label && containerRef.current) {
              const bounds = label.getScreenBounds(
                camera,
                containerRef.current.clientWidth,
                containerRef.current.clientHeight
              );
              
              if (bounds) {
                const clickX = event.clientX - rect.left;
                const clickY = event.clientY - rect.top;
                
                if (
                  clickX >= bounds.left &&
                  clickX <= bounds.right &&
                  clickY >= bounds.top &&
                  clickY <= bounds.bottom
                ) {
                  intersects.push({
                    planet,
                    body,
                    distance: 0, // 标签点击优先级最高
                    type: 'label',
                    isSatellite,
                  });
                }
              }
            }
          }
        });
        
        // 选择最近的行星（只接受标记圈、标签或星球网格的直接点击）
        if (intersects.length > 0) {
          // 优先选择标记圈或标签点击，这些是用户明确想要聚焦的
          const markerOrLabelClick = intersects.find(i => i.type === 'marker' || i.type === 'label');
          
          // 如果没有标记圈或标签点击，检查是否有星球网格的直接点击
          // 但要确保该行星在屏幕上足够大，避免误触远处的小行星
          let meshClick = intersects.find(i => i.type === 'mesh');
          
          // 对于网格点击，检查行星在屏幕上的视觉大小
          if (meshClick && !markerOrLabelClick && containerRef.current) {
            const planetWorldPos = new THREE.Vector3(meshClick.body.x, meshClick.body.y, meshClick.body.z);
            const distanceToCamera = camera.position.distanceTo(planetWorldPos);
            const planetRadius = meshClick.planet.getRealRadius();
            
            // 计算行星在屏幕上的视觉角度大小（弧度）
            const angularSize = 2 * Math.atan(planetRadius / distanceToCamera);
            
            // 计算行星在屏幕上的像素大小
            const fov = camera.fov * (Math.PI / 180); // 转换为弧度
            const screenHeight = containerRef.current.clientHeight;
            const pixelSize = (angularSize / fov) * screenHeight;
            
            // 只有当行星在屏幕上的大小超过阈值时才接受网格点击
            // 阈值设置为30像素，避免误触远处的小行星
            const minPixelSize = 30;
            if (pixelSize < minPixelSize) {
              meshClick = undefined;
            }
          }
          
          // 只有在点击了标记圈、标签或足够大的星球网格时才聚焦
          const target = markerOrLabelClick || meshClick;
          
          if (target) {
            // 选中行星
            const selectedPlanetName = target.body.name;
            useSolarSystemStore.getState().selectPlanet(selectedPlanetName);
            
            // Log the type of object clicked
            const objectType = target.isSatellite ? 'satellite' : 'planet';
            console.log(`Focusing on ${objectType}: ${selectedPlanetName} (clicked ${target.type})`);
            
            // 平滑移动相机到行星位置（放大显示）
            const targetPosition = new THREE.Vector3(target.body.x, target.body.y, target.body.z);
            
            // 创建天体对象用于FocusManager
            const planetRadius = target.planet.getRealRadius();
            const celestialObject = {
              name: selectedPlanetName,
              radius: planetRadius,
              type: selectedPlanetName.toLowerCase() === 'sun' ? 'star' as const : 'planet' as const
            };
            
            // 创建跟踪函数，用于获取行星的实时位置
            const trackingTargetGetter = () => {
              const currentBodies = useSolarSystemStore.getState().celestialBodies;
              const currentBody = currentBodies.find((b: any) => b.name === selectedPlanetName);
              if (currentBody) {
                return new THREE.Vector3(currentBody.x, currentBody.y, currentBody.z);
              }
              // 如果找不到行星，返回当前位置（不应该发生）
              return targetPosition.clone();
            };
            
            // 使用新的FocusManager API进行聚焦
            cameraControllerRef.current.focusOnTarget(
              targetPosition, 
              celestialObject, 
              trackingTargetGetter
            );
          }
          // 如果没有有效的点击目标（比如点击了空白区域），不执行任何操作
        }
        
        // 重置拖动检测状态
        isDragging = false;
        mouseDownTime = 0;
      };
      
      // 使用已经声明的 renderer 变量
      renderer.domElement.addEventListener('mousedown', handleMouseDown);
      renderer.domElement.addEventListener('mousemove', handleMouseMove);
      renderer.domElement.addEventListener('mouseup', handleMouseUp);
      renderer.domElement.addEventListener('click', handleClick);
      
      // 也在 labelRenderer 的 DOM 元素上添加点击事件（用于点击标记圈）
      if (labelRendererRef.current) {
        labelRendererRef.current.domElement.addEventListener('mousedown', handleMouseDown);
        labelRendererRef.current.domElement.addEventListener('mousemove', handleMouseMove);
        labelRendererRef.current.domElement.addEventListener('mouseup', handleMouseUp);
        labelRendererRef.current.domElement.addEventListener('click', handleClick);
      }

      // 启动动画循环
      animationFrameRef.current = requestAnimationFrame(animate);

      // 初始化完成后自动聚焦到地球
      setTimeout(() => {
        const earthBody = currentState.celestialBodies.find((b: any) => b.name.toLowerCase() === 'earth');
        if (earthBody && cameraControllerRef.current) {
          // 选中地球
          useSolarSystemStore.getState().selectPlanet('Earth');
          
          // 获取地球的Planet实例
          const earthPlanet = planetsRef.current.get('earth');
          if (earthPlanet) {
            const targetPosition = new THREE.Vector3(earthBody.x, earthBody.y, earthBody.z);
            const planetRadius = earthPlanet.getRealRadius();
            
            const celestialObject = {
              name: 'Earth',
              radius: planetRadius,
              type: 'planet' as const
            };
            
            // 创建跟踪函数
            const trackingTargetGetter = () => {
              const currentBodies = useSolarSystemStore.getState().celestialBodies;
              const currentBody = currentBodies.find((b: any) => b.name === 'Earth');
              if (currentBody) {
                return new THREE.Vector3(currentBody.x, currentBody.y, currentBody.z);
              }
              return targetPosition.clone();
            };
            
            // 聚焦到地球
            cameraControllerRef.current.focusOnTarget(
              targetPosition, 
              celestialObject, 
              trackingTargetGetter
            );
            
            console.log('Auto-focused on Earth');
          }
        }
      }, 500); // 延迟500ms，确保场景完全初始化

      // 处理窗口大小变化
      const handleResize = () => {
        if (sceneManagerRef.current) {
          sceneManagerRef.current.updateSize();
        }
        if (labelRendererRef.current && containerRef.current) {
          labelRendererRef.current.setSize(
            containerRef.current.clientWidth,
            containerRef.current.clientHeight
          );
        }
      };

      window.addEventListener('resize', handleResize);
      const resizeObserver = new ResizeObserver(handleResize);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      // 清理函数（在 checkAndInit 内部，确保能访问所有局部变量）
    return () => {
        // 取消 checkAndInit 的递归检查（如果还在等待初始化）
        if (checkAndInitFrameId !== null) {
          cancelAnimationFrame(checkAndInitFrameId);
          checkAndInitFrameId = null;
        }
        
        // 取消动画循环
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        // 清理事件监听器
        if (sceneManagerRef.current && renderer) {
          renderer.domElement.removeEventListener('mousedown', handleMouseDown);
          renderer.domElement.removeEventListener('mousemove', handleMouseMove);
          renderer.domElement.removeEventListener('mouseup', handleMouseUp);
          renderer.domElement.removeEventListener('click', handleClick);
        }
        if (labelRendererRef.current) {
          labelRendererRef.current.domElement.removeEventListener('mousedown', handleMouseDown);
          labelRendererRef.current.domElement.removeEventListener('mousemove', handleMouseMove);
          labelRendererRef.current.domElement.removeEventListener('mouseup', handleMouseUp);
          labelRendererRef.current.domElement.removeEventListener('click', handleClick);
        }
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();

        // 清理资源
        // 释放贴图引用（TextureManager 管理实际 GPU 资源）
        const textureManager = TextureManager.getInstance();
        planetsRef.current.forEach((planet) => {
          const bodyId = planet.getTextureBodyId();
          if (bodyId) {
            textureManager.releaseTexture(bodyId);
          }
          planet.dispose();
        });
        orbitsRef.current.forEach((orbit) => orbit.dispose());
        
        // 清理标签
        labelsRef.current.forEach((label) => {
          label.dispose();
          const sprite = label.getSprite();
          if (sprite.parent) {
            sprite.parent.remove(sprite);
          }
        });
        labelsRef.current.clear();
        
        // 清理标签渲染器
        if (labelRendererRef.current && containerRef.current && containerRef.current.contains(labelRendererRef.current.domElement)) {
          containerRef.current.removeChild(labelRendererRef.current.domElement);
        }
        labelRendererRef.current = null;
        
        // 清理卫星图层
        if (satelliteLayerRef.current) {
          satelliteLayerRef.current.dispose();
          satelliteLayerRef.current = null;
        }
        
        if (cameraControllerRef.current) {
          cameraControllerRef.current.dispose();
        }
        if (sceneManagerRef.current) {
          sceneManagerRef.current.dispose();
        }
      };
    };
    
    checkAndInit();
  }, []); // 只在挂载时初始化

  // 注意：行星位置更新已经在动画循环中处理，这里不需要额外的 useEffect
  // 这样可以避免不必要的重渲染和性能开销

  // 注意：滚轮缩放现在由 CameraController 的 setupWheelZoom 处理
  // 这里不再需要额外的监听器，避免重复处理

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative"
      style={{ 
        // ⚠️ 修复：移除 touchAction: 'none'（已在 Canvas 元素上设置）
        // ⚠️ 修复：移除 transform: 'translateZ(0)'（会创建新的 stacking context，导致 fixed 定位失效）
        // ⚠️ 修复：移除 isolation: 'isolate'（会创建新的 stacking context，导致 fixed 定位的 z-index 失效，Firefox 平板特别敏感）
        // 防止移动端默认手势干扰
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        // 性能优化：使用GPU加速（但不用 transform，避免破坏 fixed 定位）
        willChange: 'opacity',
        // 渐显效果
        opacity: opacity,
        transition: 'opacity 1s ease-in-out',
      } as React.CSSProperties}
      onTouchStart={() => {
        // 让相机控制器完全处理所有触摸事件
        // 不在这里阻止默认行为，避免与相机控制器冲突
      }}
      onTouchMove={() => {
        // 让相机控制器完全处理所有触摸事件
      }}
      onTouchEnd={() => {
        // 让相机控制器完全处理所有触摸事件
      }}
    >
      {/* 距离地球显示 */}
      <DistanceDisplay distanceAU={distanceToEarth} />
      <ScaleRuler 
        camera={cameraRef.current} 
        container={containerRef.current}
        controlsTarget={cameraControllerRef.current?.getControls()?.target || null}
      />
      
      {/* 太阳系参考网格比例尺 */}
      <GridScaleRuler sceneManager={sceneManagerRef.current} />
      
      {/* 天体搜索组件 - 只在 SceneManager 和 CameraController 准备好后渲染 */}
      {sceneManagerRef.current && cameraControllerRef.current && (
        <SearchErrorBoundary>
          <CelestialSearch 
            sceneManager={sceneManagerRef.current}
            cameraController={cameraControllerRef.current}
          />
        </SearchErrorBoundary>
      )}
      
      {/* 设置菜单（仅在 3D 模式下显示） */}
      {isCameraControllerReady && cameraControllerRef.current && (
        <SettingsMenu 
          cameraController={cameraControllerRef.current} 
        />
      )}
      
      {/* 卫星详情模态框 */}
      <SatelliteDetailModal lang={lang} />
    </div>
  );
}

