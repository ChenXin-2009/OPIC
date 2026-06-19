/**
 * LoadingLogs Component
 * 
 * 科幻风格的加载日志显示组件
 * 在页面加载时显示实时系统日志作为背景
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface LoadingLogsProps {
  isAnimating: boolean;
}

/**
 * 生成时间戳
 */
const getTimestamp = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
};

/**
 * 加载日志序列 - 大幅扩展版本，提供详细的系统初始化信息
 */
const LOG_SEQUENCE = [
  // 系统启动
  { message: '========================================', type: 'info' as const, delay: 0 },
  { message: 'COSMIC EXPLORER v3.0.0 - SYSTEM BOOT', type: 'info' as const, delay: 10 },
  { message: '========================================', type: 'info' as const, delay: 20 },
  { message: 'Initializing core systems...', type: 'info' as const, delay: 30 },
  { message: 'Checking browser compatibility...', type: 'info' as const, delay: 40 },
  { message: 'User Agent: Chrome/131.0.0.0', type: 'info' as const, delay: 50 },
  { message: 'Platform: Windows NT 10.0', type: 'info' as const, delay: 60 },
  { message: 'Screen resolution: 1920x1080', type: 'info' as const, delay: 70 },
  { message: 'Device pixel ratio: 1.0', type: 'info' as const, delay: 80 },
  { message: 'Available memory: 8192 MB', type: 'info' as const, delay: 90 },
  { message: 'Browser compatibility check passed', type: 'success' as const, delay: 100 },
  
  // WebGL初始化
  { message: 'Checking WebGL 2.0 support...', type: 'info' as const, delay: 110 },
  { message: 'WebGL 2.0 context available', type: 'success' as const, delay: 120 },
  { message: 'GPU Vendor: NVIDIA Corporation', type: 'info' as const, delay: 130 },
  { message: 'GPU Renderer: NVIDIA GeForce RTX 3060', type: 'info' as const, delay: 140 },
  { message: 'Max texture size: 16384x16384', type: 'info' as const, delay: 150 },
  { message: 'Max vertex attributes: 16', type: 'info' as const, delay: 160 },
  { message: 'Max texture units: 32', type: 'info' as const, delay: 170 },
  { message: 'Max varying vectors: 31', type: 'info' as const, delay: 180 },
  { message: 'Max fragment uniform vectors: 1024', type: 'info' as const, delay: 190 },
  { message: 'Max vertex uniform vectors: 1024', type: 'info' as const, delay: 200 },
  
  // Three.js加载
  { message: 'Loading Three.js renderer v0.160.0...', type: 'info' as const, delay: 210 },
  { message: 'Allocating WebGL context...', type: 'info' as const, delay: 220 },
  { message: 'Setting up render pipeline...', type: 'info' as const, delay: 230 },
  { message: 'Configuring antialiasing (MSAA x4)...', type: 'info' as const, delay: 240 },
  { message: 'Enabling depth testing...', type: 'info' as const, delay: 250 },
  { message: 'Enabling alpha blending...', type: 'info' as const, delay: 260 },
  { message: 'Setting clear color: #000000', type: 'info' as const, delay: 270 },
  { message: 'WebGL context initialized successfully', type: 'success' as const, delay: 280 },
  
  // 天体数据加载
  { message: 'Loading celestial body data...', type: 'info' as const, delay: 290 },
  { message: 'Parsing VSOP87 orbital elements...', type: 'info' as const, delay: 300 },
  { message: 'Loading planetary system configuration...', type: 'info' as const, delay: 310 },
  { message: 'Total bodies to load: 27 (8 planets + 19 satellites)', type: 'info' as const, delay: 320 },
  
  // 行星轨道参数
  { message: 'Calculating orbital parameters for Mercury...', type: 'info' as const, delay: 330 },
  { message: 'Mercury: a=0.387 AU, e=0.206, i=7.0°', type: 'info' as const, delay: 340 },
  { message: 'Calculating orbital parameters for Venus...', type: 'info' as const, delay: 350 },
  { message: 'Venus: a=0.723 AU, e=0.007, i=3.4°', type: 'info' as const, delay: 360 },
  { message: 'Calculating orbital parameters for Earth...', type: 'info' as const, delay: 370 },
  { message: 'Earth: a=1.000 AU, e=0.017, i=0.0°', type: 'info' as const, delay: 380 },
  { message: 'Calculating orbital parameters for Mars...', type: 'info' as const, delay: 390 },
  { message: 'Mars: a=1.524 AU, e=0.093, i=1.9°', type: 'info' as const, delay: 400 },
  { message: 'Calculating orbital parameters for Jupiter...', type: 'info' as const, delay: 410 },
  { message: 'Jupiter: a=5.203 AU, e=0.048, i=1.3°', type: 'info' as const, delay: 420 },
  { message: 'Calculating orbital parameters for Saturn...', type: 'info' as const, delay: 430 },
  { message: 'Saturn: a=9.537 AU, e=0.054, i=2.5°', type: 'info' as const, delay: 440 },
  { message: 'Calculating orbital parameters for Uranus...', type: 'info' as const, delay: 450 },
  { message: 'Uranus: a=19.191 AU, e=0.047, i=0.8°', type: 'info' as const, delay: 460 },
  { message: 'Calculating orbital parameters for Neptune...', type: 'info' as const, delay: 470 },
  { message: 'Neptune: a=30.069 AU, e=0.009, i=1.8°', type: 'info' as const, delay: 480 },
  { message: 'Orbital elements loaded successfully', type: 'success' as const, delay: 490 },
  
  // 纹理加载
  { message: 'Loading planet textures (2K resolution)...', type: 'info' as const, delay: 500 },
  { message: 'Texture format: WebP (lossy compression)', type: 'info' as const, delay: 510 },
  { message: 'Loading texture: 2k_mercury.webp...', type: 'info' as const, delay: 520 },
  { message: 'Mercury texture: 2048x1024, 156 KB', type: 'info' as const, delay: 530 },
  { message: 'Loading texture: 2k_venus_atmosphere.webp...', type: 'info' as const, delay: 540 },
  { message: 'Venus texture: 2048x1024, 234 KB', type: 'info' as const, delay: 550 },
  { message: 'Loading texture: 2k_earth_daymap.webp...', type: 'info' as const, delay: 560 },
  { message: 'Earth day texture: 2048x1024, 412 KB', type: 'info' as const, delay: 570 },
  { message: 'Loading texture: 2k_earth_nightmap.webp...', type: 'info' as const, delay: 580 },
  { message: 'Earth night texture: 2048x1024, 89 KB', type: 'info' as const, delay: 590 },
  { message: 'Loading texture: 2k_earth_clouds.webp...', type: 'info' as const, delay: 600 },
  { message: 'Earth clouds texture: 2048x1024, 178 KB', type: 'info' as const, delay: 610 },
  { message: 'Loading texture: 2k_mars.webp...', type: 'info' as const, delay: 620 },
  { message: 'Mars texture: 2048x1024, 267 KB', type: 'info' as const, delay: 630 },
  { message: 'Loading texture: 2k_jupiter.webp...', type: 'info' as const, delay: 640 },
  { message: 'Jupiter texture: 2048x1024, 345 KB', type: 'info' as const, delay: 650 },
  { message: 'Loading texture: 2k_saturn.webp...', type: 'info' as const, delay: 660 },
  { message: 'Saturn texture: 2048x1024, 289 KB', type: 'info' as const, delay: 670 },
  { message: 'Loading texture: 2k_saturn_ring_alpha.png...', type: 'info' as const, delay: 680 },
  { message: 'Saturn ring texture: 1024x1024, 45 KB', type: 'info' as const, delay: 690 },
  { message: 'Loading texture: 2k_uranus.webp...', type: 'info' as const, delay: 700 },
  { message: 'Uranus texture: 2048x1024, 123 KB', type: 'info' as const, delay: 710 },
  { message: 'Loading texture: 2k_neptune.webp...', type: 'info' as const, delay: 720 },
  { message: 'Neptune texture: 2048x1024, 156 KB', type: 'info' as const, delay: 730 },
  { message: 'Loading texture: 2k_moon.webp...', type: 'info' as const, delay: 740 },
  { message: 'Moon texture: 2048x1024, 234 KB', type: 'info' as const, delay: 750 },
  { message: 'Texture cache: 13/27 loaded...', type: 'info' as const, delay: 760 },
  { message: 'All textures loaded successfully', type: 'success' as const, delay: 770 },
  
  // 星历数据初始化
  { message: 'Initializing ephemeris calculator...', type: 'info' as const, delay: 780 },
  { message: 'Loading manifest.json from /data/ephemeris...', type: 'info' as const, delay: 790 },
  { message: 'Manifest loaded: 23 data chunks available', type: 'success' as const, delay: 800 },
  { message: 'Ephemeris data source: JPL DE440', type: 'info' as const, delay: 810 },
  { message: 'Ephemeris time range: 2009-01-01 to 2109-12-31', type: 'info' as const, delay: 820 },
  { message: 'Ephemeris format: Chebyshev polynomials', type: 'info' as const, delay: 830 },
  { message: 'Compression: gzip (deflate algorithm)', type: 'info' as const, delay: 840 },
  { message: 'Total ephemeris data size: 50.83 MB (compressed)', type: 'info' as const, delay: 850 },
  { message: 'Loading Moon ephemeris data (default enabled)...', type: 'warning' as const, delay: 860 },
  { message: 'Fetching: /data/ephemeris/moon-ephemeris.bin.gz...', type: 'info' as const, delay: 870 },
  { message: 'Download progress: 512 KB / 2.1 MB', type: 'info' as const, delay: 880 },
  { message: 'Download progress: 1.5 MB / 2.1 MB', type: 'info' as const, delay: 890 },
  { message: 'Download complete: 2.1 MB', type: 'success' as const, delay: 900 },
  { message: 'Decompressing gzip data stream...', type: 'info' as const, delay: 910 },
  { message: 'Decompression complete: 6.8 MB uncompressed', type: 'success' as const, delay: 920 },
  { message: 'Parsing Chebyshev polynomial coefficients...', type: 'info' as const, delay: 930 },
  { message: 'Coefficient order: 13 (position), 12 (velocity)', type: 'info' as const, delay: 940 },
  { message: 'Time segments: 36500 (1 day per segment)', type: 'info' as const, delay: 950 },
  { message: 'Moon ephemeris loaded: 36500 segments', type: 'success' as const, delay: 960 },
  
  // 场景图构建
  { message: 'Building scene graph...', type: 'info' as const, delay: 970 },
  { message: 'Creating root scene node...', type: 'info' as const, delay: 980 },
  { message: 'Creating Sun mesh (radius: 0.00465 AU)...', type: 'info' as const, delay: 990 },
  { message: 'Sun geometry: IcosahedronGeometry(1, 32)', type: 'info' as const, delay: 1000 },
  { message: 'Sun material: MeshBasicMaterial (emissive)', type: 'info' as const, delay: 1010 },
  { message: 'Creating planet meshes with LOD system...', type: 'info' as const, delay: 1020 },
  { message: 'LOD Level 0: 64 segments (distance < 5 AU)', type: 'info' as const, delay: 1030 },
  { message: 'LOD Level 1: 32 segments (distance < 20 AU)', type: 'info' as const, delay: 1040 },
  { message: 'LOD Level 2: 16 segments (distance >= 20 AU)', type: 'info' as const, delay: 1050 },
  { message: 'Creating Mercury mesh...', type: 'info' as const, delay: 1060 },
  { message: 'Creating Venus mesh...', type: 'info' as const, delay: 1070 },
  { message: 'Creating Earth mesh...', type: 'info' as const, delay: 1080 },
  { message: 'Creating Mars mesh...', type: 'info' as const, delay: 1090 },
  { message: 'Creating Jupiter mesh...', type: 'info' as const, delay: 1100 },
  { message: 'Creating Saturn mesh...', type: 'info' as const, delay: 1110 },
  { message: 'Creating Saturn ring system...', type: 'info' as const, delay: 1120 },
  { message: 'Ring inner radius: 1.2x planet radius', type: 'info' as const, delay: 1130 },
  { message: 'Ring outer radius: 2.3x planet radius', type: 'info' as const, delay: 1140 },
  { message: 'Creating Uranus mesh...', type: 'info' as const, delay: 1150 },
  { message: 'Creating Neptune mesh...', type: 'info' as const, delay: 1160 },
  { message: 'Generating orbit curves (512 points each)...', type: 'info' as const, delay: 1170 },
  { message: 'Orbit curve material: LineBasicMaterial', type: 'info' as const, delay: 1180 },
  { message: 'Applying orbital fade shader...', type: 'info' as const, delay: 1190 },
  { message: 'Fade distance: 0.3 orbit period', type: 'info' as const, delay: 1200 },
  { message: 'Scene graph built: 27 celestial bodies', type: 'success' as const, delay: 1210 },
  
  // 相机控制器
  { message: 'Initializing camera controller...', type: 'info' as const, delay: 1220 },
  { message: 'Camera type: PerspectiveCamera', type: 'info' as const, delay: 1230 },
  { message: 'Field of view: 45 degrees', type: 'info' as const, delay: 1240 },
  { message: 'Near plane: 0.001 AU', type: 'info' as const, delay: 1250 },
  { message: 'Far plane: 1000 AU', type: 'info' as const, delay: 1260 },
  { message: 'Setting up OrbitControls...', type: 'info' as const, delay: 1270 },
  { message: 'Configuring camera constraints...', type: 'info' as const, delay: 1280 },
  { message: 'Min distance: 0.001 AU', type: 'info' as const, delay: 1290 },
  { message: 'Max distance: 100 AU', type: 'info' as const, delay: 1300 },
  { message: 'Enable damping: true (factor: 0.05)', type: 'info' as const, delay: 1310 },
  { message: 'Enable zoom: true', type: 'info' as const, delay: 1320 },
  { message: 'Enable pan: true', type: 'info' as const, delay: 1330 },
  { message: 'Enable rotate: true', type: 'info' as const, delay: 1340 },
  { message: 'Camera controller ready', type: 'success' as const, delay: 1350 },
  
  // 宇宙尺度渲染器
  { message: 'Loading universe scale renderers...', type: 'info' as const, delay: 1360 },
  { message: 'Initializing multi-scale rendering system...', type: 'info' as const, delay: 1370 },
  { message: 'Scale levels: Solar System, Local Group, Virgo, Laniakea', type: 'info' as const, delay: 1380 },
  { message: 'Loading Local Group galaxy data...', type: 'info' as const, delay: 1390 },
  { message: 'Data source: McConnachie 2012 catalog', type: 'info' as const, delay: 1400 },
  { message: 'Parsing binary galaxy catalog...', type: 'info' as const, delay: 1410 },
  { message: 'Galaxy data format: position (x,y,z), velocity, mass', type: 'info' as const, delay: 1420 },
  { message: 'Local Group: 80 galaxies loaded', type: 'success' as const, delay: 1430 },
  { message: 'Loading Virgo Supercluster data...', type: 'info' as const, delay: 1440 },
  { message: 'Data source: 2MRS catalog', type: 'info' as const, delay: 1450 },
  { message: 'Virgo Supercluster: 2000+ galaxies loaded', type: 'success' as const, delay: 1460 },
  { message: 'Loading Laniakea Supercluster data...', type: 'info' as const, delay: 1470 },
  { message: 'Data source: Cosmicflows-3 catalog', type: 'info' as const, delay: 1480 },
  { message: 'Laniakea: 100,000+ galaxies loaded', type: 'success' as const, delay: 1490 },
  { message: 'Generating galaxy point cloud...', type: 'info' as const, delay: 1500 },
  { message: 'Point cloud vertices: 102,345', type: 'info' as const, delay: 1510 },
  { message: 'Point cloud material: PointsMaterial (size: 0.5)', type: 'info' as const, delay: 1520 },
  { message: 'Universe scale renderers ready', type: 'success' as const, delay: 1530 },
  
  // 卫星追踪系统
  { message: 'Initializing satellite tracking system...', type: 'info' as const, delay: 1540 },
  { message: 'Loading TLE data from CelesTrak API...', type: 'info' as const, delay: 1550 },
  { message: 'TLE format: Two-Line Element Set', type: 'info' as const, delay: 1560 },
  { message: 'Fetching active satellites catalog...', type: 'info' as const, delay: 1570 },
  { message: 'Parsing Two-Line Element sets...', type: 'info' as const, delay: 1580 },
  { message: 'TLE Line 1: Catalog number, epoch, drag', type: 'info' as const, delay: 1590 },
  { message: 'TLE Line 2: Inclination, RAAN, eccentricity, arg perigee', type: 'info' as const, delay: 1600 },
  { message: 'Initializing SGP4 propagator...', type: 'info' as const, delay: 1610 },
  { message: 'SGP4 model: Simplified General Perturbations', type: 'info' as const, delay: 1620 },
  { message: 'Propagator accuracy: ±1 km for LEO satellites', type: 'info' as const, delay: 1630 },
  { message: 'Loading satellite metadata...', type: 'info' as const, delay: 1640 },
  { message: 'Metadata: name, type, country, launch date', type: 'info' as const, delay: 1650 },
  { message: 'Total satellites loaded: 1,234', type: 'info' as const, delay: 1660 },
  { message: 'Satellite tracking system ready', type: 'success' as const, delay: 1670 },
  
  // 着色器编译
  { message: 'Compiling shader programs...', type: 'info' as const, delay: 1680 },
  { message: 'Shader language: GLSL ES 3.0', type: 'info' as const, delay: 1690 },
  { message: 'Compiling vertex shader: planet.vert...', type: 'info' as const, delay: 1700 },
  { message: 'Vertex shader: 45 lines, 3 attributes, 2 uniforms', type: 'info' as const, delay: 1710 },
  { message: 'Compiling fragment shader: planet.frag...', type: 'info' as const, delay: 1720 },
  { message: 'Fragment shader: 67 lines, 4 uniforms, 2 textures', type: 'info' as const, delay: 1730 },
  { message: 'Linking shader program...', type: 'info' as const, delay: 1740 },
  { message: 'Shader program linked successfully', type: 'success' as const, delay: 1750 },
  { message: 'Compiling vertex shader: atmosphere.vert...', type: 'info' as const, delay: 1760 },
  { message: 'Compiling fragment shader: atmosphere.frag...', type: 'info' as const, delay: 1770 },
  { message: 'Atmosphere shader compiled successfully', type: 'success' as const, delay: 1780 },
  { message: 'Compiling vertex shader: ring.vert...', type: 'info' as const, delay: 1790 },
  { message: 'Compiling fragment shader: ring.frag...', type: 'info' as const, delay: 1800 },
  { message: 'Ring shader compiled successfully', type: 'success' as const, delay: 1810 },
  { message: 'All shader programs compiled', type: 'success' as const, delay: 1820 },
  
  // 渲染管线优化
  { message: 'Optimizing render pipeline...', type: 'info' as const, delay: 1830 },
  { message: 'Enabling frustum culling...', type: 'info' as const, delay: 1840 },
  { message: 'Frustum culling: Skip objects outside view', type: 'info' as const, delay: 1850 },
  { message: 'Configuring LOD thresholds...', type: 'info' as const, delay: 1860 },
  { message: 'LOD threshold 0: 5 AU', type: 'info' as const, delay: 1870 },
  { message: 'LOD threshold 1: 20 AU', type: 'info' as const, delay: 1880 },
  { message: 'Setting up render layers...', type: 'info' as const, delay: 1890 },
  { message: 'Layer 0: Celestial bodies', type: 'info' as const, delay: 1900 },
  { message: 'Layer 1: Orbit curves', type: 'info' as const, delay: 1910 },
  { message: 'Layer 2: Labels and UI', type: 'info' as const, delay: 1920 },
  { message: 'Layer 3: Satellites', type: 'info' as const, delay: 1930 },
  { message: 'Enabling occlusion culling...', type: 'info' as const, delay: 1940 },
  { message: 'Configuring render order...', type: 'info' as const, delay: 1950 },
  { message: 'Render pipeline optimized', type: 'success' as const, delay: 1960 },
  
  // UI组件初始化
  { message: 'Initializing UI components...', type: 'info' as const, delay: 1970 },
  { message: 'Loading CSS2D label renderer...', type: 'info' as const, delay: 1980 },
  { message: 'CSS2D renderer: HTML labels in 3D space', type: 'info' as const, delay: 1990 },
  { message: 'Setting up time control interface...', type: 'info' as const, delay: 2000 },
  { message: 'Time control: Play, pause, speed adjustment', type: 'info' as const, delay: 2010 },
  { message: 'Time range: 2009-01-01 to 2109-12-31', type: 'info' as const, delay: 2020 },
  { message: 'Initializing search system...', type: 'info' as const, delay: 2030 },
  { message: 'Search index: 27 celestial bodies + 1,234 satellites', type: 'info' as const, delay: 2040 },
  { message: 'Search algorithm: Fuzzy string matching', type: 'info' as const, delay: 2050 },
  { message: 'Loading settings panel...', type: 'info' as const, delay: 2060 },
  { message: 'Settings: Graphics, ephemeris, display options', type: 'info' as const, delay: 2070 },
  { message: 'Loading info panel...', type: 'info' as const, delay: 2080 },
  { message: 'Info panel: Object details, orbital parameters', type: 'info' as const, delay: 2090 },
  { message: 'UI components ready', type: 'success' as const, delay: 2100 },
  
  // 性能监控
  { message: 'Initializing performance monitor...', type: 'info' as const, delay: 2110 },
  { message: 'Monitoring: FPS, frame time, memory usage', type: 'info' as const, delay: 2120 },
  { message: 'Target framerate: 60 FPS', type: 'info' as const, delay: 2130 },
  { message: 'Frame budget: 16.67 ms', type: 'info' as const, delay: 2140 },
  { message: 'Performance monitor ready', type: 'success' as const, delay: 2150 },
  
  // 事件系统
  { message: 'Setting up event system...', type: 'info' as const, delay: 2160 },
  { message: 'Registering mouse event handlers...', type: 'info' as const, delay: 2170 },
  { message: 'Events: click, mousemove, mousewheel', type: 'info' as const, delay: 2180 },
  { message: 'Registering keyboard event handlers...', type: 'info' as const, delay: 2190 },
  { message: 'Keyboard shortcuts: Space, Arrow keys, +/-', type: 'info' as const, delay: 2200 },
  { message: 'Registering touch event handlers...', type: 'info' as const, delay: 2210 },
  { message: 'Touch gestures: Pinch zoom, pan, rotate', type: 'info' as const, delay: 2220 },
  { message: 'Event system ready', type: 'success' as const, delay: 2230 },
  
  // 最终检查
  { message: 'Running system diagnostics...', type: 'info' as const, delay: 2240 },
  { message: 'Checking memory allocation...', type: 'info' as const, delay: 2250 },
  { message: 'Memory usage: 245 MB / 8192 MB', type: 'info' as const, delay: 2260 },
  { message: 'Checking GPU memory...', type: 'info' as const, delay: 2270 },
  { message: 'GPU memory: 512 MB / 6144 MB', type: 'info' as const, delay: 2280 },
  { message: 'Verifying all systems...', type: 'info' as const, delay: 2290 },
  { message: 'WebGL context: OK', type: 'success' as const, delay: 2300 },
  { message: 'Scene graph: OK', type: 'success' as const, delay: 2310 },
  { message: 'Textures: OK', type: 'success' as const, delay: 2320 },
  { message: 'Shaders: OK', type: 'success' as const, delay: 2330 },
  { message: 'Camera: OK', type: 'success' as const, delay: 2340 },
  { message: 'UI: OK', type: 'success' as const, delay: 2350 },
  { message: 'Events: OK', type: 'success' as const, delay: 2360 },
  { message: 'All systems verified', type: 'success' as const, delay: 2370 },
  
  // 启动动画循环
  { message: 'Starting animation loop...', type: 'info' as const, delay: 2380 },
  { message: 'Animation loop: requestAnimationFrame', type: 'info' as const, delay: 2390 },
  { message: 'Render mode: Continuous', type: 'info' as const, delay: 2400 },
  { message: 'VSync: Enabled', type: 'info' as const, delay: 2410 },
  { message: 'Animation loop started', type: 'success' as const, delay: 2420 },
  
  // 系统就绪
  { message: '========================================', type: 'info' as const, delay: 2430 },
  { message: 'SYSTEM READY - All systems operational', type: 'success' as const, delay: 2440 },
  { message: 'Total initialization time: 2.44 seconds', type: 'info' as const, delay: 2450 },
  { message: 'Welcome to Cosmic Explorer!', type: 'success' as const, delay: 2460 },
  { message: '========================================', type: 'info' as const, delay: 2470 },
];

/** 科幻风格加载日志 — 在页面加载时显示实时系统日志作为背景 */
export default function LoadingLogs({ isAnimating }: LoadingLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdCounter = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAnimating) return;

    const timers: NodeJS.Timeout[] = [];

    // 按序列添加日志
    LOG_SEQUENCE.forEach((logItem) => {
      const timer = setTimeout(() => {
        const newLog: LogEntry = {
          id: logIdCounter.current++,
          timestamp: getTimestamp(),
          message: logItem.message,
          type: logItem.type,
        };

        setLogs((prev) => {
          // 保持最多60条日志，让屏幕上有更多内容
          const updated = [...prev, newLog];
          return updated.slice(-60);
        });

        // 自动滚动到底部
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, logItem.delay);

      timers.push(timer);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [isAnimating]);

  // 获取日志颜色 - 冷钢蓝标准色系
  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'rgba(157, 195, 208, 0.5)'; // #9dc3d0 - 浅钢蓝（成功）
      case 'warning':
        return 'rgba(124, 169, 185, 0.5)'; // #7ca9b9 - 中浅钢蓝（警告）
      default:
        return 'rgba(72, 130, 150, 0.4)'; // #488296 - 标准钢蓝（普通）
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 bottom-0 w-[55%] overflow-hidden pointer-events-none scrollbar-hide"
      style={{
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        fontSize: '11px',
        lineHeight: '1.6',
        padding: '30px 20px 30px 40px',
        overflowY: 'auto',
      }}
    >
      {/* 日志内容 */}
      <div className="space-y-1">
        {logs.map((log, index) => (
          <div
            key={log.id}
            className="flex items-start gap-3 transition-opacity duration-300"
            style={{
              color: getLogColor(log.type),
              opacity: 0,
              animation: `fadeInLog 0.1s ease-out ${index * 0.015}s forwards`,
            }}
          >
            {/* 时间戳 */}
            <span
              className="flex-shrink-0"
              style={{
                color: 'rgba(46, 95, 110, 0.45)', // #2e5f6e - 较深钢蓝
                fontWeight: 300,
              }}
            >
              [{log.timestamp}]
            </span>

            {/* 类型标记 */}
            <span
              className="flex-shrink-0 font-bold"
              style={{
                width: '60px',
                color: getLogColor(log.type),
              }}
            >
              {log.type === 'success' && '[OK]'}
              {log.type === 'warning' && '[LOAD]'}
              {log.type === 'info' && '[INFO]'}
            </span>

            {/* 消息 */}
            <span className="flex-1">{log.message}</span>

            {/* 装饰性光标 */}
            {index === logs.length - 1 && (
              <span
                className="inline-block w-2 h-3 ml-1"
                style={{
                  background: getLogColor(log.type),
                  animation: 'blink 1s step-end infinite',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* CSS动画定义 */}
      <style jsx>{`
        @keyframes fadeInLog {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
