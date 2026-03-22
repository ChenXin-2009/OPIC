'use client';

import { useState, useEffect, useRef } from 'react';
import { debugRotationOffset } from '@/lib/cesium/CoordinateTransformer';

interface CesiumDebugInfo {
  // 相机信息
  cameraDistanceToEarth: number; // AU
  cameraDistanceToSurface: number; // km
  cameraPosition: { x: number; y: number; z: number }; // AU
  
  // Cesium 状态
  cesiumEnabled: boolean;
  cesiumInitialized: boolean;
  cesiumRendering: boolean;
  
  // 坐标转换
  longitude: number; // 度
  latitude: number; // 度
  height: number; // km
  
  // 渲染信息
  tilesLoaded: number;
  tilesLoading: number;
  textureMemoryUsage: number; // MB
  
  // 性能
  fps: number;
  cesiumRenderTime: number; // ms
  textureUpdateTime: number; // ms
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface CesiumDebugPanelProps {
  earthPlanet?: any; // EarthPlanet 实例
  camera?: any; // Three.js Camera
}

export default function CesiumDebugPanel({ earthPlanet, camera }: CesiumDebugPanelProps) {
  const [debugInfo, setDebugInfo] = useState<CesiumDebugInfo>({
    cameraDistanceToEarth: 0,
    cameraDistanceToSurface: 0,
    cameraPosition: { x: 0, y: 0, z: 0 },
    cesiumEnabled: false,
    cesiumInitialized: false,
    cesiumRendering: false,
    longitude: 0,
    latitude: 0,
    height: 0,
    tilesLoaded: 0,
    tilesLoading: 0,
    textureMemoryUsage: 0,
    fps: 0,
    cesiumRenderTime: 0,
    textureUpdateTime: 0,
  });
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [rotZ, setRotZ] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 添加日志
  const addLog = (level: 'info' | 'warn' | 'error', message: string) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    setLogs(prev => {
      const newLogs = [...prev, { timestamp, level, message }];
      // 只保留最近 50 条日志
      return newLogs.slice(-50);
    });
  };

  // 自动滚动到最新日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 更新调试信息
  useEffect(() => {
    if (!earthPlanet || !camera) {
      addLog('warn', 'Waiting for earthPlanet and camera...');
      return;
    }

    addLog('info', 'Debug panel initialized');
    
    // 注册 Cesium 日志回调
    const cesiumExt = earthPlanet.getCesiumExtension?.();
    if (cesiumExt && typeof cesiumExt.onLog === 'function') {
      cesiumExt.onLog((level: 'info' | 'warn' | 'error', message: string) => {
        addLog(level, message);
      });
    }
    
    // 初始化 FPS 计数器
    frameCountRef.current = 0;
    lastTimeRef.current = performance.now();
    
    // 用于跟踪上一次的 Cesium 状态，避免重复日志
    let lastCesiumEnabled = false;
    let currentFps = 0;

    const updateInterval = setInterval(() => {
      // 计算 FPS
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;
      
      if (elapsed >= 1000) {
        currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      try {
        // 获取相机位置
        const cameraPos = camera.position;
        const earthPos = earthPlanet.getMesh().position;
        
        // 计算距离
        const distanceAU = cameraPos.distanceTo(earthPos);
        const AU_TO_KM = 149597870.7;
        const earthRadiusKm = earthPlanet.getRealRadius() * AU_TO_KM;
        const distanceToSurfaceKm = (distanceAU * AU_TO_KM) - earthRadiusKm;

        // 获取 Cesium 扩展
        const cesiumExt = earthPlanet.getCesiumExtension?.();
        const cesiumEnabled = cesiumExt !== null;
        
        // 获取瓦片加载状态
        let tilesLoaded = 0;
        let tilesLoading = 0;
        if (cesiumExt && typeof cesiumExt.getTileLoadingStats === 'function') {
          const stats = cesiumExt.getTileLoadingStats();
          tilesLoaded = stats.loaded;
          tilesLoading = stats.loading;
        }
        
        // 只在状态真正变化时记录日志
        if (cesiumEnabled !== lastCesiumEnabled) {
          addLog('info', `Cesium ${cesiumEnabled ? 'enabled' : 'disabled'}`);
          lastCesiumEnabled = cesiumEnabled;
        }
        
        // 更新调试信息
        setDebugInfo({
          cameraDistanceToEarth: distanceAU,
          cameraDistanceToSurface: distanceToSurfaceKm,
          cameraPosition: {
            x: cameraPos.x,
            y: cameraPos.y,
            z: cameraPos.z,
          },
          cesiumEnabled,
          cesiumInitialized: cesiumExt !== null,
          cesiumRendering: cesiumExt !== null && (earthPlanet as any).cesiumEnabled === true,
          longitude: 0, // TODO: 从 CoordinateTransformer 获取
          latitude: 0, // TODO: 从 CoordinateTransformer 获取
          height: distanceToSurfaceKm,
          tilesLoaded,
          tilesLoading,
          textureMemoryUsage: 0, // TODO: 从 Cesium Viewer 获取
          fps: currentFps,
          cesiumRenderTime: 0, // TODO: 从性能监控获取
          textureUpdateTime: 0, // TODO: 从性能监控获取
        });
      } catch (error) {
        addLog('error', `Update error: ${error}`);
      }
    }, 100); // 每 100ms 更新一次

    return () => clearInterval(updateInterval);
  }, [earthPlanet, camera]); // 移除 debugInfo 依赖，避免无限循环

  return (
    <div style={{
      position: 'fixed',
      left: '10px',
      top: '80px',
      width: isCollapsed ? '200px' : '380px',
      maxHeight: 'calc(100vh - 100px)',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: '#ffffff',
      padding: '12px',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontSize: '11px',
      zIndex: 1000,
      border: '1px solid rgba(255, 255, 255, 0.2)',
      transition: 'width 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 标题栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '12px', 
          fontWeight: 'bold',
          color: '#4a9eff',
        }}>
          🛠️ CESIUM DEBUG
        </h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '0 4px',
          }}
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* 相机信息 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              color: '#4a9eff', 
              fontWeight: 'bold', 
              marginBottom: '6px',
              fontSize: '10px',
              textTransform: 'uppercase',
            }}>
              📷 Camera
            </div>
            <div style={{ paddingLeft: '8px' }}>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>Distance:</span>{' '}
                <span style={{ color: '#fff' }}>{debugInfo.cameraDistanceToEarth.toFixed(4)} AU</span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>To Surface:</span>{' '}
                <span style={{ color: '#fff' }}>{debugInfo.cameraDistanceToSurface.toFixed(0)} km</span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>Position:</span>{' '}
                <span style={{ color: '#fff' }}>
                  ({debugInfo.cameraPosition.x.toFixed(2)}, {debugInfo.cameraPosition.y.toFixed(2)}, {debugInfo.cameraPosition.z.toFixed(2)})
                </span>
              </div>
            </div>
          </div>

          {/* Cesium 状态 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              color: '#4a9eff', 
              fontWeight: 'bold', 
              marginBottom: '6px',
              fontSize: '10px',
              textTransform: 'uppercase',
            }}>
              🌍 Cesium Status
            </div>
            <div style={{ paddingLeft: '8px' }}>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>Enabled:</span>{' '}
                <span style={{ color: debugInfo.cesiumEnabled ? '#4ade80' : '#f87171' }}>
                  {debugInfo.cesiumEnabled ? '✓ YES' : '✗ NO'}
                </span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>Initialized:</span>{' '}
                <span style={{ color: debugInfo.cesiumInitialized ? '#4ade80' : '#f87171' }}>
                  {debugInfo.cesiumInitialized ? '✓ YES' : '✗ NO'}
                </span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>Rendering:</span>{' '}
                <span style={{ color: debugInfo.cesiumRendering ? '#4ade80' : '#f87171' }}>
                  {debugInfo.cesiumRendering ? '✓ YES' : '✗ NO'}
                </span>
              </div>
            </div>
          </div>

          {/* 坐标信息 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              color: '#4a9eff', 
              fontWeight: 'bold', 
              marginBottom: '6px',
              fontSize: '10px',
              textTransform: 'uppercase',
            }}>
              🗺️ Coordinates
            </div>
            <div style={{ paddingLeft: '8px' }}>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>Longitude:</span>{' '}
                <span style={{ color: '#fff' }}>{debugInfo.longitude.toFixed(2)}°</span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>Latitude:</span>{' '}
                <span style={{ color: '#fff' }}>{debugInfo.latitude.toFixed(2)}°</span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>Height:</span>{' '}
                <span style={{ color: '#fff' }}>{debugInfo.height.toFixed(0)} km</span>
              </div>
            </div>
          </div>

          {/* 渲染信息 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              color: '#4a9eff', 
              fontWeight: 'bold', 
              marginBottom: '6px',
              fontSize: '10px',
              textTransform: 'uppercase',
            }}>
              🎨 Rendering
            </div>
            <div style={{ paddingLeft: '8px' }}>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>Tiles Loaded:</span>{' '}
                <span style={{ color: '#fff' }}>{debugInfo.tilesLoaded}</span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>Tiles Loading:</span>{' '}
                <span style={{ color: '#fff' }}>{debugInfo.tilesLoading}</span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>Texture Memory:</span>{' '}
                <span style={{ color: '#fff' }}>{debugInfo.textureMemoryUsage.toFixed(1)} MB</span>
              </div>
            </div>
          </div>

          {/* 性能信息 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              color: '#4a9eff', 
              fontWeight: 'bold', 
              marginBottom: '6px',
              fontSize: '10px',
              textTransform: 'uppercase',
            }}>
              ⚡ Performance
            </div>
            <div style={{ paddingLeft: '8px' }}>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>FPS:</span>{' '}
                <span style={{ 
                  color: debugInfo.fps >= 50 ? '#4ade80' : debugInfo.fps >= 30 ? '#fbbf24' : '#f87171' 
                }}>
                  {debugInfo.fps}
                </span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>Cesium Render:</span>{' '}
                <span style={{ color: '#fff' }}>{debugInfo.cesiumRenderTime.toFixed(2)} ms</span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ color: '#999' }}>Texture Update:</span>{' '}
                <span style={{ color: '#fff' }}>{debugInfo.textureUpdateTime.toFixed(2)} ms</span>
              </div>
            </div>
          </div>

          {/* 旋转调试控件 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              color: '#f59e0b',
              fontWeight: 'bold',
              marginBottom: '6px',
              fontSize: '10px',
              textTransform: 'uppercase',
            }}>
              🔧 Rotation Debug (deg)
            </div>
            {(['x', 'y', 'z'] as const).map((axis) => {
              const val = axis === 'x' ? rotX : axis === 'y' ? rotY : rotZ;
              const setter = axis === 'x' ? setRotX : axis === 'y' ? setRotY : setRotZ;
              return (
                <div key={axis} style={{ marginBottom: '6px', paddingLeft: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ color: '#999' }}>Rot {axis.toUpperCase()}:</span>
                    <span style={{ color: '#fff', minWidth: '50px', textAlign: 'right' }}>{val.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={0.5}
                    value={val}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setter(v);
                      debugRotationOffset[axis] = v;
                    }}
                    style={{ width: '100%', accentColor: '#f59e0b' }}
                  />
                </div>
              );
            })}
            <button
              onClick={() => {
                setRotX(0); setRotY(0); setRotZ(0);
                debugRotationOffset.x = 0;
                debugRotationOffset.y = 0;
                debugRotationOffset.z = 0;
              }}
              style={{
                marginLeft: '8px',
                background: 'none',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#999',
                cursor: 'pointer',
                fontSize: '9px',
                padding: '2px 8px',
                borderRadius: '2px',
              }}
            >
              RESET
            </button>
          </div>

          {/* 日志输出 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ 
              color: '#4a9eff', 
              fontWeight: 'bold', 
              marginBottom: '6px',
              fontSize: '10px',
              textTransform: 'uppercase',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>📋 Logs</span>
              <button
                onClick={() => setLogs([])}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#999',
                  cursor: 'pointer',
                  fontSize: '9px',
                  padding: '2px 6px',
                  borderRadius: '2px',
                }}
              >
                CLEAR
              </button>
            </div>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              padding: '6px',
              borderRadius: '2px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              minHeight: '120px',
              maxHeight: '200px',
            }}>
              {logs.length === 0 ? (
                <div style={{ color: '#666', fontSize: '10px' }}>No logs yet...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} style={{ marginBottom: '4px', fontSize: '10px' }}>
                    <span style={{ color: '#666' }}>[{log.timestamp}]</span>{' '}
                    <span style={{ 
                      color: log.level === 'error' ? '#f87171' : log.level === 'warn' ? '#fbbf24' : '#4ade80',
                      fontWeight: 'bold',
                    }}>
                      {log.level.toUpperCase()}
                    </span>{' '}
                    <span style={{ color: '#fff' }}>{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
