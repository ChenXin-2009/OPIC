/**
 * Dock 初始化器 (Dock Initializer)
 *
 * 在应用启动时初始化 Dock 栏的默认项目和关联窗口。
 * 注册设置、搜索、MOD 管理等窗口到窗口管理器。
 */

'use client';

import { useEffect } from 'react';
import { useDockStore } from '@/lib/state/DockStore';
import { useWindowManagerStore } from '@/lib/state/WindowManagerStore';
import { useSceneStore } from '@/lib/state/SceneStore';
import { defaultDockItems } from '@/lib/config/defaultDockItems';
import { SettingsWindow } from './windows/SettingsWindow';
import { SearchWindow } from './windows/SearchWindow';
import { ModManagerWindow } from './windows/ModManagerWindow';
import { AboutWindow } from './windows/AboutWindow';
import { EphemerisStatusWindow } from './windows/EphemerisStatusWindow';
import { SatelliteWindow } from './windows/SatelliteWindow';
import { CesiumControlWindow } from './windows/CesiumControlWindow';
import { SpaceLaunchWindow } from './windows/SpaceLaunchWindow';
import { GlobalTrafficWindow } from './windows/GlobalTrafficWindow';
import { WeatherDisasterWindow } from './windows/WeatherDisasterWindow';
import { MoonWindow } from './windows/MoonWindow';
import { GravityGridWindow } from './windows/GravityGridWindow';
import { SpaceFlightWindow } from './windows/SpaceFlightWindow';
import { getRegistry } from '@/lib/mod-manager/core/ModRegistry';
import { getEventBus } from '@/lib/mod-manager/core/EventBus';

// MOD 窗口映射
const MOD_WINDOWS: Record<string, { component: React.ReactNode; size: { width: number; height: number }; icon: string }> = {
  'satellite-tracking': {
    component: <SatelliteWindow lang="zh" />,
    size: { width: 450, height: 550 },
    icon: '📡',
  },
  'cesium-integration': {
    component: <CesiumControlWindow lang="zh" />,
    size: { width: 400, height: 500 },
    icon: '🌍',
  },
  'space-launches': {
    component: <SpaceLaunchWindow lang="zh" />,
    size: { width: 500, height: 600 },
    icon: '🚀',
  },
  'global-traffic': {
    component: <GlobalTrafficWindow lang="zh" />,
    size: { width: 450, height: 550 },
    icon: '🚢',
  },
  'weather-disaster': {
    component: <WeatherDisasterWindow lang="zh" />,
    size: { width: 450, height: 550 },
    icon: '',
  },
  'moon': {
    component: <MoonWindow lang="zh" />,
    size: { width: 320, height: 480 },
    icon: '',
  },
  'gravity-grid': {
    component: <GravityGridWindow lang="zh" />,
    size: { width: 520, height: 680 },
    icon: '🌐',
  },
  'space-flight': {
    component: <SpaceFlightWindow lang="zh" />,
    size: { width: 520, height: 680 },
    icon: '🚀',
  },
};

/**
 * Dock 初始化组件
 * 
 * 负责初始化默认的 Dock 项目并设置点击事件
 * 同时监听 MOD 扩展点注册,动态添加 MOD 贡献的 Dock 图标
 */
export function DockInitializer() {
  const { addItem, removeItem, hasItem } = useDockStore();
  const { openWindow } = useWindowManagerStore();
  const { sceneManager, cameraController } = useSceneStore();

  useEffect(() => {
    // 初始化默认 Dock 项目
    defaultDockItems.forEach((config) => {
      if (!hasItem(config.id)) {
        addItem({
          ...config,
          type: 'app',
          isRunning: false,
          onClick: () => {
            // 点击 Dock 图标时打开对应窗口
            if (config.windowId) {
              // 根据不同的窗口 ID 渲染不同的内容
              switch (config.id) {
                case 'settings':
                  openWindow({
                    id: config.windowId,
                    title: config.label,
                    content: <SettingsWindow cameraController={cameraController} />,
                    defaultPosition: { x: 100, y: 100 },
                    defaultSize: { width: 500, height: 500 },
                    icon: config.icon,
                  });
                  break;

                case 'search':
                  openWindow({
                    id: config.windowId,
                    title: config.label,
                    content: <SearchWindow />,
                    defaultPosition: { x: 150, y: 100 },
                    defaultSize: { width: 500, height: 600 },
                    icon: config.icon,
                  });
                  break;

                case 'ephemeris':
                  openWindow({
                    id: config.windowId,
                    title: config.label,
                    content: <EphemerisStatusWindow lang="zh" />,
                    defaultPosition: { x: 240, y: 100 },
                    defaultSize: { width: 450, height: 600 },
                    icon: config.icon,
                  });
                  break;

                case 'mods':
                  openWindow({
                    id: config.windowId,
                    title: config.label,
                    content: <ModManagerWindow lang="zh" />,
                    defaultPosition: { x: 250, y: 100 },
                    defaultSize: { width: 800, height: 600 },
                    icon: config.icon,
                  });
                  break;

                case 'about':
                  openWindow({
                    id: config.windowId,
                    title: config.label,
                    content: <AboutWindow lang="zh" />,
                    defaultPosition: { x: 300, y: 100 },
                    defaultSize: { width: 600, height: 700 },
                    icon: config.icon,
                  });
                  break;

                default:
                  // 其他窗口使用占位内容
                  openWindow({
                    id: config.windowId,
                    title: config.label,
                    content: (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="text-6xl mb-4">{config.icon}</div>
                          <h2 className="text-2xl font-bold mb-2">{config.label}</h2>
                          <p className="text-white/60">窗口内容将在后续阶段实现</p>
                        </div>
                      </div>
                    ),
                    defaultPosition: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 100 },
                    defaultSize: { width: 600, height: 400 },
                    icon: config.icon,
                  });
              }
            }
          },
        });
      }
    });

    // 监听 MOD 扩展点注册事件,动态添加 Dock 图标
    const modRegistry = getRegistry();
    if (!modRegistry) {
      console.warn('ModRegistry 尚未初始化');
      return;
    }

    const contributionRegistry = modRegistry.getContributionRegistry();
    const eventBus = getEventBus();

    // 初始加载所有已注册的 MOD Dock 图标
    const loadModDockIcons = () => {
      const modDockIcons = contributionRegistry.getDockIcons();
      
      modDockIcons.forEach((dockIcon) => {
        const dockItemId = `mod-${dockIcon.modId}-${dockIcon.id}`;
        
        if (!hasItem(dockItemId)) {
          // 获取 MOD 实例以使用其 manifest 中的名称
          const modInstance = modRegistry.get(dockIcon.modId);
          const manifest = modInstance?.manifest;
          
          // 优先使用 labelZh，其次使用 manifest 的 nameZh 或 name，最后使用 label
          const displayLabel = dockIcon.labelZh 
            || (manifest ? (manifest.nameZh || manifest.name) : dockIcon.label);
          
          addItem({
            id: dockItemId,
            icon: dockIcon.icon,
            label: displayLabel,
            type: 'app',
            isRunning: false,
            badge: typeof dockIcon.badge === 'number' ? dockIcon.badge : undefined,
            onClick: () => {
              // 执行 MOD 定义的命令
              if (dockIcon.command) {
                contributionRegistry.executeCommand(dockIcon.command)
                  .catch((error) => {
                    console.error(`执行命令 ${dockIcon.command} 失败:`, error);
                  });
              }
            },
          });
        }
      });
    };

    // 初始加载
    loadModDockIcons();

    // 监听 MOD 启用事件
    const handleModEnabled = (_data: unknown) => {
      // 重新加载 Dock 图标
      loadModDockIcons();
    };

    // 监听 MOD 禁用事件
    const handleModDisabled = (_data: unknown) => {
      // 移除不再存在的图标
      // 注意:这里需要遍历所有 mod- 开头的项目
      // 由于 dockStore 没有提供 getAllItems,我们只能在禁用时移除特定 MOD 的图标
      // 暂时不实现完整的移除逻辑,因为需要修改 dockStore
    };

    // 监听 MOD 打开窗口事件
    const handleModOpenWindow = (data: unknown) => {
      if (data && typeof data === 'object' && 'modId' in data && 'windowId' in data) {
        const { modId, windowId, title, titleZh } = data as {
          modId: string;
          windowId: string;
          title: string;
          titleZh?: string;
        };
        
        // 根据 modId 打开对应的窗口
        const windowConfig = MOD_WINDOWS[modId];
        if (windowConfig) {
          openWindow({
            id: windowId,
            title: titleZh || title,
            content: windowConfig.component,
            defaultPosition: { x: 200 + Math.random() * 100, y: 100 + Math.random() * 50 },
            defaultSize: windowConfig.size,
            icon: windowConfig.icon,
          });
        }
      }
    };

    eventBus.on('mod:enabled', handleModEnabled);
    eventBus.on('mod:disabled', handleModDisabled);
    eventBus.on('mod:open-window', handleModOpenWindow);

    return () => {
      eventBus.off('mod:enabled', handleModEnabled);
      eventBus.off('mod:disabled', handleModDisabled);
      eventBus.off('mod:open-window', handleModOpenWindow);
    };
  }, [addItem, removeItem, hasItem, openWindow, sceneManager, cameraController]);

  return null;
}
