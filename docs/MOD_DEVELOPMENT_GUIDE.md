# MOD 开发指�?

## 简�?

欢迎使用 OPIC MOD 系统！本指南将帮助你开发功能强大且安全�?MOD，充分利�?OPIC 提供的企业级插件平台能力�?

<div align="center">
  <img src="images/mod-manager-interface.gif" alt="MOD管理器界�? width="300">
  <p><em>MOD 管理器界面与示例模组展示</em></p>
</div>

OPIC MOD 系统提供以下核心功能�?

- **权限系统**: 细粒度的 API 访问控制
- **扩展点机�?*: 声明�?UI 扩展(Dock 图标、窗口、命�?
- **配置 Schema**: 自动生成配置 UI
- **服务注册�?*: MOD 间安全通信
- **沙箱隔离**: 资源配额�?API 调用隔离

## 快速开�?

### 1. MOD 清单结构

每个 MOD 都需要一�?`manifest.json` 文件来声明其元数据、权限和扩展�?

\`\`\`json
{
  "id": "my-awesome-mod",
  "name": "My Awesome MOD",
  "nameZh": "我的超棒 MOD",
  "version": "1.0.0",
  "description": "A sample MOD demonstrating all features",
  "descriptionZh": "演示所有功能的示例 MOD",
  "author": "Your Name",
  "apiVersion": "1.0.0",
  
  "permissions": [
    "time:read",
    "camera:write",
    "render:*"
  ],
  
  "optionalPermissions": [
    "network:execute"
  ],
  
  "contributes": {
    "dockIcons": [...],
    "windows": [...],
    "commands": [...]
  },
  
  "configSchema": {...},
  
  "services": [...],
  
  "resourceQuota": {
    "maxMemoryMB": 50,
    "maxRenderObjects": 1000
  }
}
\`\`\`

### 2. MOD 入口文件

创建 `index.ts` 作为 MOD 的入口点:

\`\`\`typescript
import type { ModContext } from '@/lib/mod-manager/types';

export default {
  /**
   * MOD 启用时调�?
   */
  onEnable(context: ModContext) {
    console.log('My MOD enabled!');
    
    // 访问 API
    const currentTime = context.api.time.currentTime;
    console.log('Current time:', currentTime);
    
    // 订阅事件
    context.api.time.onTimeChange((time) => {
      console.log('Time changed:', time);
    });
  },
  
  /**
   * MOD 禁用时调�?
   */
  onDisable(context: ModContext) {
    console.log('My MOD disabled!');
    // 清理资源
  },
  
  /**
   * 配置变更时调�?
   */
  onConfigChange(context: ModContext, newConfig: any) {
    console.log('Config changed:', newConfig);
  },
};
\`\`\`

## 权限系统

### 权限声明

MOD 必须在清单中声明所需的权限才能访问系�?API。权限格式为 \`category:action\`�?

#### 权限类别

- \`time\`: 时间系统 API
- \`camera\`: 相机控制 API
- \`celestial\`: 天体数据 API
- \`satellite\`: 卫星数据 API
- \`render\`: 渲染系统 API
- \`network\`: 网络请求 API
- \`storage\`: 本地存储 API
- \`events\`: 事件系统 API

#### 权限操作

- \`read\`: 读取数据
- \`write\`: 修改数据
- \`execute\`: 执行操作
- \`*\`: 所有操�?通配�?

#### 示例

\`\`\`json
{
  "permissions": [
    "time:read",           // 读取当前时间
    "time:write",          // 修改时间和时间流�?
    "camera:*",            // 完全控制相机
    "render:write",        // 添加渲染对象
    "network:execute"      // 发起网络请求
  ],
  
  "optionalPermissions": [
    "storage:write"        // 可选权�?用户可以撤销
  ]
}
\`\`\`

### 权限最佳实�?

1. **最小权限原�?*: 只声明必需的权�?
2. **使用可选权�?*: 对于非核心功�?使用 \`optionalPermissions\`
3. **权限说明**: 在文档中解释为什么需要每个权�?
4. **优雅降级**: 当可选权限被拒绝�?提供降级功能

\`\`\`typescript
// 检查权�?
if (context.hasPermission('network:execute')) {
  // 使用网络功能
  await fetchData();
} else {
  // 使用本地缓存
  useLocalCache();
}
\`\`\`

## 扩展点机�?

### Dock 图标扩展�?

�?Dock 中添加图�?点击时执行命令�?

\`\`\`json
{
  "contributes": {
    "dockIcons": [
      {
        "id": "my-icon",
        "icon": "/icons/my-icon.svg",
        "label": "My Feature",
        "labelZh": "我的功能",
        "order": 100,
        "command": "my-mod.openWindow",
        "badge": 5
      }
    ]
  }
}
\`\`\`

**字段说明**:
- \`id\`: 图标唯一标识�?
- \`icon\`: 图标 URL 或路�?
- \`label\`: 英文标签
- \`labelZh\`: 中文标签(可�?
- \`order\`: 排序顺序(数字越小越靠�?
- \`command\`: 点击时执行的命令 ID
- \`badge\`: 徽章(数字或字符串,可�?

**动态更新徽�?*:

\`\`\`typescript
// �?MOD 代码中更新徽�?
context.updateDockIconBadge('my-mod.my-icon', 10);
\`\`\`

### 窗口扩展�?

注册自定义窗�?系统自动管理窗口生命周期�?

\`\`\`json
{
  "contributes": {
    "windows": [
      {
        "id": "my-window",
        "title": "My Window",
        "titleZh": "我的窗口",
        "component": "MyWindowComponent",
        "defaultSize": { "width": 800, "height": 600 },
        "defaultPosition": { "x": 100, "y": 100 },
        "resizable": true,
        "minimizable": true
      }
    ]
  }
}
\`\`\`

**�?MOD 中定义窗口组�?*:

\`\`\`typescript
export default {
  onEnable(context: ModContext) {
    // 窗口组件会自动注�?
  },
  
  // 窗口组件
  MyWindowComponent() {
    return (
      <div className="p-4">
        <h1>My Window Content</h1>
        <p>This is a custom window!</p>
      </div>
    );
  },
  
  // 打开窗口的命令处理器
  openWindow(context: ModContext) {
    context.openWindow('my-mod.my-window');
  },
};
\`\`\`

### 命令扩展�?

注册全局命令,可通过命令面板或快捷键触发�?

\`\`\`json
{
  "contributes": {
    "commands": [
      {
        "id": "open-window",
        "title": "Open My Window",
        "titleZh": "打开我的窗口",
        "category": "View",
        "keybinding": "Ctrl+Shift+M",
        "handler": "openWindow"
      }
    ]
  }
}
\`\`\`

**命令处理�?*:

\`\`\`typescript
export default {
  // 命令处理器函�?
  openWindow(context: ModContext) {
    console.log('Opening window...');
    context.openWindow('my-mod.my-window');
  },
  
  // 也可以接收参�?
  executeWithArgs(context: ModContext, arg1: string, arg2: number) {
    console.log('Args:', arg1, arg2);
  },
};
\`\`\`

## 配置 Schema

使用 JSON Schema 声明配置�?系统自动生成配置 UI�?

### 基本示例

\`\`\`json
{
  "configSchema": {
    "type": "object",
    "properties": {
      "enabled": {
        "type": "boolean",
        "title": "Enable Feature",
        "description": "Enable or disable this feature",
        "default": true
      },
      "refreshInterval": {
        "type": "number",
        "title": "Refresh Interval (seconds)",
        "description": "How often to refresh data",
        "default": 60,
        "minimum": 10,
        "maximum": 3600
      },
      "apiEndpoint": {
        "type": "string",
        "title": "API Endpoint",
        "description": "The API endpoint URL",
        "default": "https://api.example.com",
        "pattern": "^https?://"
      },
      "theme": {
        "type": "string",
        "title": "Theme",
        "enum": ["light", "dark", "auto"],
        "default": "auto"
      }
    },
    "required": ["apiEndpoint"]
  }
}
\`\`\`

### 支持的类�?

- \`string\`: 文本输入
- \`number\`: 数字输入
- \`boolean\`: 开�?
- \`array\`: 数组(列表)
- \`object\`: 嵌套对象

### 验证规则

- \`required\`: 必填字段
- \`minimum\` / \`maximum\`: 数字范围
- \`minLength\` / \`maxLength\`: 字符串长�?
- \`pattern\`: 正则表达�?
- \`enum\`: 枚举�?

### 嵌套对象和数�?

\`\`\`json
{
  "configSchema": {
    "type": "object",
    "properties": {
      "server": {
        "type": "object",
        "title": "Server Settings",
        "properties": {
          "host": { "type": "string", "default": "localhost" },
          "port": { "type": "number", "default": 8080 }
        }
      },
      "tags": {
        "type": "array",
        "title": "Tags",
        "items": { "type": "string" },
        "default": ["tag1", "tag2"]
      }
    }
  }
}
\`\`\`

### 访问配置

\`\`\`typescript
export default {
  onEnable(context: ModContext) {
    const config = context.getConfig();
    console.log('Enabled:', config.enabled);
    console.log('Refresh interval:', config.refreshInterval);
  },
  
  onConfigChange(context: ModContext, newConfig: any) {
    console.log('Config updated:', newConfig);
    // 应用新配�?
  },
};
\`\`\`

## 服务注册�?

MOD 可以注册服务供其�?MOD 调用,实现功能复用�?

### 注册服务

\`\`\`json
{
  "services": [
    {
      "id": "data-provider",
      "interface": "IDataProvider",
      "visibility": "public",
      "permissions": ["time:read"]
    }
  ]
}
\`\`\`

\`\`\`typescript
// 定义服务接口
export interface IDataProvider {
  getData(): Promise<any>;
  refreshData(): Promise<void>;
}

export default {
  onEnable(context: ModContext) {
    // 注册服务实现
    context.registerService<IDataProvider>('my-mod.data-provider', {
      async getData() {
        return { data: 'example' };
      },
      
      async refreshData() {
        console.log('Refreshing data...');
      },
    });
  },
};
\`\`\`

### 调用服务

\`\`\`typescript
export default {
  async onEnable(context: ModContext) {
    // 获取其他 MOD 的服�?
    const dataProvider = await context.getService<IDataProvider>(
      'other-mod.data-provider'
    );
    
    if (dataProvider) {
      const data = await dataProvider.getData();
      console.log('Got data:', data);
    }
  },
};
\`\`\`

### 服务可见�?

- \`public\`: 所�?MOD 可访�?
- \`internal\`: 仅同一作者的 MOD 可访�?
- \`private\`: 仅当�?MOD 可访�?

### 服务权限

调用服务需要声明对应的权限:

\`\`\`json
{
  "permissions": [
    "service:other-mod.data-provider"
  ]
}
\`\`\`

## API 参�?

### Time API

\`\`\`typescript
// 读取时间(需�?time:read 权限)
const currentTime = context.api.time.currentTime;
const isPlaying = context.api.time.isPlaying;
const timeSpeed = context.api.time.timeSpeed;

// 修改时间(需�?time:write 权限)
context.api.time.setCurrentTime(new Date('2024-01-01'));
context.api.time.togglePlayPause();
context.api.time.setTimeSpeed(10);

// 订阅时间变化
const unsubscribe = context.api.time.onTimeChange((time) => {
  console.log('Time changed:', time);
});

// 取消订阅
unsubscribe();
\`\`\`

### Camera API

\`\`\`typescript
// 读取相机状�?需�?camera:read 权限)
const position = context.api.camera.getPosition();
const target = context.api.camera.getTarget();

// 控制相机(需�?camera:write 权限)
context.api.camera.flyTo({
  position: [0, 0, 10000000],
  duration: 2000,
});

context.api.camera.lookAt({
  target: [0, 0, 0],
  distance: 10000000,
});

// 订阅相机变化
const unsubscribe = context.api.camera.onCameraMove((camera) => {
  console.log('Camera moved:', camera);
});
\`\`\`

### Render API

\`\`\`typescript
// 注册渲染�?需�?render:write 权限)
context.api.render.registerRenderer('my-renderer', (scene, camera) => {
  // 自定义渲染逻辑
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  
  return {
    update: (deltaTime) => {
      // 更新逻辑
    },
    dispose: () => {
      // 清理资源
      scene.remove(mesh);
    },
  };
});

// 注销渲染�?
context.api.render.unregisterRenderer('my-renderer');

// 渲染回调(需�?render:execute 权限)
const unsubscribe = context.api.render.onBeforeRender(() => {
  // 在渲染前执行
});
\`\`\`

### Celestial API

\`\`\`typescript
// 获取天体数据(需�?celestial:read 权限)
const planets = context.api.celestial.getPlanets();
const earth = context.api.celestial.getPlanet('earth');

// 订阅天体位置更新
const unsubscribe = context.api.celestial.onPositionUpdate((body, position) => {
  console.log(\`\${body} position:\`, position);
});
\`\`\`

## 资源配额

系统会限制每�?MOD 的资源使�?防止单个 MOD 影响系统性能�?

### 默认配额

\`\`\`json
{
  "resourceQuota": {
    "maxMemoryMB": 50,
    "maxRenderObjects": 1000,
    "maxEventListeners": 100,
    "maxTimers": 50,
    "maxAPICallsPerSecond": 100
  }
}
\`\`\`

### 配额超限处理

�?MOD 超过配额�?系统会抛�?\`QuotaExceededError\` 异常:

\`\`\`typescript
try {
  // 可能超过配额的操�?
  context.api.render.registerRenderer('renderer', factory);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.error('Quota exceeded:', error.message);
    // 清理一些资�?
  }
}
\`\`\`

### 查询配额使用情况

\`\`\`typescript
const usage = context.getResourceUsage();
console.log('Memory:', usage.memoryMB, 'MB');
console.log('Render objects:', usage.renderObjects);
console.log('Event listeners:', usage.eventListeners);
\`\`\`

## 最佳实�?

### 1. 错误处理

始终捕获和处理错�?防止 MOD 崩溃影响系统:

\`\`\`typescript
export default {
  async onEnable(context: ModContext) {
    try {
      await initializeFeature();
    } catch (error) {
      console.error('Failed to initialize:', error);
      // 优雅降级
    }
  },
};
\`\`\`

### 2. 资源清理

�?\`onDisable\` 中清理所有资�?

\`\`\`typescript
export default {
  onEnable(context: ModContext) {
    this.unsubscribers = [
      context.api.time.onTimeChange(handler1),
      context.api.camera.onCameraMove(handler2),
    ];
  },
  
  onDisable(context: ModContext) {
    // 取消所有订�?
    this.unsubscribers.forEach(unsub => unsub());
    
    // 注销渲染�?
    context.api.render.unregisterRenderer('my-renderer');
    
    // 清理定时�?
    clearInterval(this.intervalId);
  },
};
\`\`\`

### 3. 性能优化

- 避免在渲染回调中执行耗时操作
- 使用节流(throttle)或防�?debounce)处理高频事件
- 延迟加载大型资源

\`\`\`typescript
import { throttle } from 'lodash';

export default {
  onEnable(context: ModContext) {
    // 节流处理相机移动事件
    const handleCameraMove = throttle((camera) => {
      // 处理逻辑
    }, 100);
    
    context.api.camera.onCameraMove(handleCameraMove);
  },
};
\`\`\`

### 4. 国际�?

支持中英文双�?

\`\`\`typescript
function getLabel(context: ModContext) {
  const lang = context.getLanguage();
  return lang === 'zh' ? '中文标签' : 'English Label';
}
\`\`\`

### 5. 类型安全

使用 TypeScript 确保类型安全:

\`\`\`typescript
import type { ModContext, TimeAPI } from '@/lib/mod-manager/types';

interface MyConfig {
  enabled: boolean;
  refreshInterval: number;
}

export default {
  onEnable(context: ModContext) {
    const config = context.getConfig<MyConfig>();
    // config 现在有类型提�?
  },
};
\`\`\`

## 调试技�?

### 1. 使用控制台日�?

\`\`\`typescript
console.log('[MyMOD] Initializing...');
console.warn('[MyMOD] Warning: Low memory');
console.error('[MyMOD] Error:', error);
\`\`\`

### 2. 查看 API 调用日志

在浏览器控制台中查看 MOD �?API 调用统计:

\`\`\`javascript
// 在浏览器控制台执�?
window.__MOD_DEBUG__.getAPICallStats('my-mod');
\`\`\`

### 3. 检查权�?

\`\`\`typescript
if (!context.hasPermission('time:write')) {
  console.warn('Missing permission: time:write');
}
\`\`\`

### 4. 监控资源使用

\`\`\`typescript
setInterval(() => {
  const usage = context.getResourceUsage();
  console.log('Resource usage:', usage);
}, 5000);
\`\`\`

## 常见问题

### Q: 如何处理权限被拒�?

A: 捕获 \`PermissionDeniedError\` 并提供降级功�?

\`\`\`typescript
try {
  context.api.time.setCurrentTime(new Date());
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    console.warn('Permission denied, using read-only mode');
  }
}
\`\`\`

### Q: 如何�?MOD 间共享数�?

A: 使用服务注册表或事件系统:

\`\`\`typescript
// 方式 1: 服务注册�?
context.registerService('my-mod.data-service', {
  getData: () => sharedData,
});

// 方式 2: 事件系统
context.emit('my-mod:data-updated', newData);
context.on('other-mod:event', (data) => {
  console.log('Received:', data);
});
\`\`\`

### Q: 如何优化渲染性能?

A: 
1. 使用 LOD(细节层次)技�?
2. 批量渲染相似对象
3. 使用 GPU 实例�?
4. 避免在每帧创建新对象

### Q: 如何测试 MOD?

A: 
1. 使用浏览器开发者工�?
2. 编写单元测试(使用 Jest)
3. 在开发环境中启用调试模式
4. 使用 MOD 管理面板�?重新加载"功能

## 示例 MOD

完整的示�?MOD 可以�?\`examples/\` 目录中找�?

- \`examples/simple-mod\`: 基础 MOD 示例
- \`examples/dock-icon-mod\`: Dock 图标扩展示例
- \`examples/window-mod\`: 自定义窗口示�?
- \`examples/service-mod\`: 服务注册示例
- \`examples/config-mod\`: 配置 Schema 示例

## 相关文档

- [API 参考文档](./API_REFERENCE.md)
- [迁移指南](./MIGRATION_GUIDE.md)
- [架构设计文档](../.kiro/specs/mod-architecture-enhancement/design.md)

## 获取帮助

如果遇到问题,可以:

1. 查看[常见问题](#常见问题)
2. 阅读[API 参考文档](./API_REFERENCE.md)
3. �?GitHub 上提�?Issue
4. 加入开发者社区讨�?

祝你开发愉�? 🚀
