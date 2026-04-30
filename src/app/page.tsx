// src/app/page.tsx 或 src/app/solar-system/page.tsx
'use client';

import { useEffect, useRef, useState } from "react";
import SolarSystemCanvas3D from "@/components/canvas/3d/SolarSystemCanvas3D";
import TimeControl from "@/components/TimeControl";
import InfoModal from "@/components/InfoModal";
import { HEADER_CONFIG } from "@/lib/config/visualConfig";
import EphemerisStatusPanel from "@/components/EphemerisStatusPanel";
import { useSolarSystemStore } from "@/lib/state";
import { useEarthControlStore } from "@/lib/state/earthControlStore";
import { initModManager, autoEnableMods } from "@/lib/mod-manager";
import { registerCoreMods } from "@/lib/mods";
import { useModStore } from "@/lib/mod-manager/store";
import { useModManager } from "@/hooks/useModManager";
import WeatherDisasterOverlay from "@/components/weather-disaster/WeatherDisasterOverlay";
import SpaceLaunchOverlay from "@/components/space-launches/SpaceLaunchOverlay";
import GlobalTrafficOverlay from "@/components/global-traffic/GlobalTrafficOverlay";
import InitializationOverlay from "@/components/InitializationOverlay";

export default function SolarSystemPage() {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isEphemerisStatusOpen, setIsEphemerisStatusOpen] = useState(false);
  
  // 使用全局状态管理地球控制
  const {
    cesiumEnabled: userCesiumEnabled,
    earthLockEnabled,
    earthLightEnabled,
    earthPlanet,
    setCesiumEnabled: setUserCesiumEnabled,
    setEarthLockEnabled,
    setEarthLightEnabled,
    setEarthPlanet,
  } = useEarthControlStore();
  
  const [camera, setCamera] = useState<any>(null);
  // 地球是否可见（相机足够近时显示按钮）
  const [earthVisible, setEarthVisible] = useState(false);
  
  // 初始化进度状态
  const [initProgress, setInitProgress] = useState({
    stage: 'idle',
    progress: 0,
    isComplete: false,
  });
  
  // 获取当前语言
  const lang = useSolarSystemStore((state) => state.lang);

  // 从MOD状态读取功能启用状态
  const cesiumModEnabled = useModStore((state) => state.mods['cesium-integration']?.state === 'enabled');
  const satelliteModEnabled = useModStore((state) => state.mods['satellite-tracking']?.state === 'enabled');
  const weatherDisasterModEnabled = useModStore((state) => state.mods['weather-disaster']?.state === 'enabled');
  const globalTrafficModEnabled = useModStore((state) => state.mods['global-traffic']?.state === 'enabled');
  const spaceLaunchesModEnabled = useModStore((state) => state.mods['space-launches']?.state === 'enabled');

  // cesiumEnabled 直接由用户控制，不受 MOD 限制
  const cesiumEnabled = userCesiumEnabled;

  const { enableMod, disableMod } = useModManager();

  // 初始化MOD管理器
  useEffect(() => {
    const init = async () => {
      initModManager();
      await registerCoreMods(); // 改为 await
      // 自动启用 defaultEnabled 的 MOD
      await autoEnableMods();
    };
    init();
  }, []);

  // 每帧检测相机到地球的距离，控制按钮显隐
  // 距离阈值：10 AU 以内认为"可以看见地球"
  const EARTH_VISIBLE_THRESHOLD = 10;
  const cameraRef = useRef(camera);
  const earthPlanetRef = useRef(earthPlanet);
  useEffect(() => { cameraRef.current = camera; }, [camera]);
  useEffect(() => { earthPlanetRef.current = earthPlanet; }, [earthPlanet]);

  useEffect(() => {
    let rafId: number;
    const check = () => {
      const cam = cameraRef.current;
      const ep = earthPlanetRef.current;
      if (cam && ep) {
        const earthPos = ep.getMesh?.()?.position;
        if (earthPos) {
          const dist = cam.position.distanceTo(earthPos);
          setEarthVisible(dist < EARTH_VISIBLE_THRESHOLD);
        }
      }
      rafId = requestAnimationFrame(check);
    };
    rafId = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 监听星历状态面板打开事件
  useEffect(() => {
    const handleOpenEphemerisStatus = () => {
      setIsEphemerisStatusOpen(true);
    };
    
    window.addEventListener('openEphemerisStatus', handleOpenEphemerisStatus);
    
    return () => {
      window.removeEventListener('openEphemerisStatus', handleOpenEphemerisStatus);
    };
  }, []);

  // 计算顶部偏移（Header高度）- 漂浮模式下不需要预留空间
  const headerHeight = (HEADER_CONFIG.enabled && !HEADER_CONFIG.floatingMode) ? HEADER_CONFIG.height : 0;

  return (
    <div 
      className="w-screen flex flex-col overflow-hidden relative"
      style={{ 
        height: '100vh',
        // 使用 dvh 适配移动端动态视口
        // @ts-ignore - dvh 是较新的 CSS 单位
        height: '100dvh',
      }}
    >
      {/* 初始化遮罩 */}
      <InitializationOverlay progress={initProgress} lang={lang} />
      
      {/* MOD 覆盖层 */}
      {weatherDisasterModEnabled && <WeatherDisasterOverlay lang={lang} />}
      {spaceLaunchesModEnabled && <SpaceLaunchOverlay lang={lang} />}
      {globalTrafficModEnabled && <GlobalTrafficOverlay lang={lang} />}
      
      {/* 模态框 */}
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
      <EphemerisStatusPanel isOpen={isEphemerisStatusOpen} onClose={() => setIsEphemerisStatusOpen(false)} />

      {/* 主容器，漂浮模式下不需要留出Header高度空间 */}
      <div 
        className="flex-1 relative min-h-0 flex flex-col"
        style={{ 
          marginTop: `${headerHeight}px`,
          isolation: 'isolate',
          // 确保不超出父容器
          maxHeight: '100%',
        }}
      >
        <div className="flex-1 relative min-h-0" style={{ isolation: 'isolate', maxHeight: '100%' }}>
          <SolarSystemCanvas3D 
            cesiumEnabled={cesiumEnabled}
            earthLockEnabled={earthLockEnabled}
            earthLightEnabled={earthLightEnabled}
            onEarthPlanetReady={setEarthPlanet}
            onCameraReady={setCamera}
            onInitializationProgress={(stage, progress, isComplete) => {
              // 直接使用场景初始化进度（0-100%）
              setInitProgress(prev => {
                // 进度只能前进，不能后退（防止重复初始化导致进度跳回）
                if (progress > prev.progress || isComplete) {
                  return { stage, progress, isComplete };
                }
                return prev;
              });
            }}
          />
        </div>
        <TimeControl />
      </div>
    </div>
  );
}
