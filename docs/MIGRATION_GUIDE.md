# MOD 架构迁移指南

## 简介

本指南帮助你将现有的 OPIC MOD 迁移到新的企业级插件架构。新架构引入了权限系统、扩展点机制、配置 Schema 等功能，同时保持向后兼容性。

**重要提示**：现有 MOD 无需立即迁移即可继续工作，但我们强烈建议尽快迁移以获得更好的安全性和功能。

## 向后兼容性

新架构完全向后兼容现有 MOD：

- ✅ 未声明权限的 MOD 自动获得所有权限
- ✅ 未使用扩展点的 MOD 保留原有注册方式
- ✅ 未声明配置 Schema 的 MOD 使用默认配置 UI
- ✅ 所有现有 API 保持不变

系统会在控制台输出向后兼容性警告,建议迁移到新 API。

## 迁移步骤

### 步骤 1: 添加权限声明

#### 旧方式(自动授予所有权限)

\`\`\`json
{
  "id": "my-mod",
  "name": "My MOD",
  "version": "1.0.0"
}
\`\`\`

#### 新方式(显式声明权限)

\`\`\`json
{
  "id": "my-mod",
  "name": "My MOD",
  "version": "1.0.0",
  "permissions": [
    "time:read",
    "camera:write",
    "render:write"
  ]
}
\`\`\`

#### 如何确定需要哪些权限?

1. 查看 MOD 使用的 API
2. 根据 API 类别和操作类型声明权限

**API 到权限的映射**:

| API 调用 | 需要的权限 |
|---------|-----------|
| \`context.api.time.currentTime\` | \`time:read\` |
| \`context.api.time.setCurrentTime()\` | \`time:write\` |
| \`context.api.camera.getPosition()\` | \`camera:read\` |
| \`context.api.camera.flyTo()\` | \`camera:write\` |
| \`context.api.render.registerRenderer()\` | \`render:write\` |
| \`context.api.celestial.getPlanets()\` | \`celestial:read\` |
| \`context.api.satellite.getSatellites()\` | \`satellite:read\` |

**通配符权限**:

如果 MOD 需要某个类别的所有权限,可以使用通配符:

\`\`\`json
{
  "permissions": [
    "time:*",      // 所有时间 API
    "camera:*",    // 所有相机 API
    "render:*"     // 所有渲染 API
  ]
}
\`\`\`

### 步骤 2: 迁移 UI 扩展到扩展点

#### 旧方式(手动注册 UI)

\`\`\`typescript
export default {
  onEnable(context: ModContext) {
    // 手动创建 Dock 图标
    const icon = document.createElement('div');
    icon.className = 'dock-icon';
    icon.onclick = () => this.openWindow();
    document.querySelector('.dock').appendChild(icon);
  },
  
  onDisable(context: ModContext) {
    // 手动清理
    icon.remove();
  },
};
\`\`\`

#### 新方式(声明式扩展点)

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
        "command": "my-mod.openWindow"
      }
    ],
    "commands": [
      {
        "id": "openWindow",
        "title": "Open My Window",
        "titleZh": "打开我的窗口",
        "handler": "openWindow"
      }
    ]
  }
}
\`\`\`

\`\`\`typescript
export default {
  // 命令处理器
  openWindow(context: ModContext) {
    // 打开窗口逻辑
  },
};
\`\`\`

**优势**:
- ✅ 无需手动管理 DOM
- ✅ 系统自动处理注册和注销
- ✅ 支持国际化
- ✅ 支持键盘快捷键

### 步骤 3: 添加配置 Schema

#### 旧方式(手动配置 UI)

\`\`\`typescript
export default {
  renderConfigUI(context: ModContext) {
    return (
      <div>
        <label>
          Enabled:
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => updateConfig({ enabled: e.target.checked })}
          />
        </label>
        <label>
          Interval:
          <input
            type="number"
            value={config.interval}
            onChange={(e) => updateConfig({ interval: Number(e.target.value) })}
          />
        </label>
      </div>
    );
  },
};
\`\`\`

#### 新方式(配置 Schema)

\`\`\`json
{
  "configSchema": {
    "type": "object",
    "properties": {
      "enabled": {
        "type": "boolean",
        "title": "Enable Feature",
        "titleZh": "启用功能",
        "default": true
      },
      "interval": {
        "type": "number",
        "title": "Refresh Interval (seconds)",
        "titleZh": "刷新间隔(秒)",
        "default": 60,
        "minimum": 10,
        "maximum": 3600
      }
    }
  }
}
\`\`\`

\`\`\`typescript
export default {
  onEnable(context: ModContext) {
    const config = context.getConfig();
    console.log('Config:', config);
  },
  
  onConfigChange(context: ModContext, newConfig: any) {
    console.log('Config updated:', newConfig);
    // 应用新配置
  },
};
\`\`\`

**优势**:
- ✅ 自动生成 UI
- ✅ 自动验证配置
- ✅ 支持国际化
- ✅ 无需手动编写表单代码

### 步骤 4: 使用服务注册表(可选)

如果你的 MOD 需要与其他 MOD 通信,可以使用服务注册表。

#### 旧方式(全局变量或事件)

\`\`\`typescript
// MOD A
window.myModData = { data: 'example' };

// MOD B
const data = window.myModData;
\`\`\`

#### 新方式(服务注册表)

\`\`\`json
// MOD A 清单
{
  "services": [
    {
      "id": "data-provider",
      "interface": "IDataProvider",
      "visibility": "public"
    }
  ]
}
\`\`\`

\`\`\`typescript
// MOD A 代码
export interface IDataProvider {
  getData(): Promise<any>;
}

export default {
  onEnable(context: ModContext) {
    context.registerService<IDataProvider>('my-mod.data-provider', {
      async getData() {
        return { data: 'example' };
      },
    });
  },
};
\`\`\`

\`\`\`typescript
// MOD B 代码
export default {
  async onEnable(context: ModContext) {
    const dataProvider = await context.getService<IDataProvider>(
      'my-mod.data-provider'
    );
    
    if (dataProvider) {
      const data = await dataProvider.getData();
      console.log('Got data:', data);
    }
  },
};
\`\`\`

**优势**:
- ✅ 类型安全
- ✅ 权限控制
- ✅ 避免全局污染
- ✅ 自动依赖管理

### 步骤 5: 添加资源配额(可选)

如果你的 MOD 需要更多资源,可以在清单中声明:

\`\`\`json
{
  "resourceQuota": {
    "maxMemoryMB": 100,
    "maxRenderObjects": 2000,
    "maxEventListeners": 200,
    "maxTimers": 100,
    "maxAPICallsPerSecond": 200
  }
}
\`\`\`

## 现有 MOD 迁移示例

### 示例 1: satellite-tracking MOD

#### 迁移前

\`\`\`json
{
  "id": "satellite-tracking",
  "name": "Satellite Tracking",
  "version": "1.0.0"
}
\`\`\`

#### 迁移后

\`\`\`json
{
  "id": "satellite-tracking",
  "name": "Satellite Tracking",
  "version": "1.1.0",
  
  "permissions": [
    "satellite:read",
    "camera:write",
    "render:write",
    "time:read"
  ],
  
  "contributes": {
    "dockIcons": [
      {
        "id": "satellite-panel",
        "icon": "/icons/satellite.svg",
        "label": "Satellites",
        "labelZh": "卫星",
        "order": 10,
        "command": "satellite-tracking.openPanel"
      }
    ],
    "commands": [
      {
        "id": "openPanel",
        "title": "Open Satellite Panel",
        "titleZh": "打开卫星面板",
        "handler": "openPanel"
      }
    ]
  },
  
  "configSchema": {
    "type": "object",
    "properties": {
      "autoUpdate": {
        "type": "boolean",
        "title": "Auto Update",
        "titleZh": "自动更新",
        "default": true
      },
      "updateInterval": {
        "type": "number",
        "title": "Update Interval (seconds)",
        "titleZh": "更新间隔(秒)",
        "default": 60,
        "minimum": 10
      }
    }
  }
}
\`\`\`

### 示例 2: weather-disaster MOD

#### 迁移前

\`\`\`json
{
  "id": "weather-disaster",
  "name": "Weather & Disaster",
  "version": "1.0.0"
}
\`\`\`

#### 迁移后

\`\`\`json
{
  "id": "weather-disaster",
  "name": "Weather & Disaster",
  "version": "1.1.0",
  
  "permissions": [
    "network:execute",
    "render:write",
    "storage:write"
  ],
  
  "optionalPermissions": [
    "notification:show"
  ],
  
  "contributes": {
    "dockIcons": [
      {
        "id": "weather-panel",
        "icon": "/icons/weather.svg",
        "label": "Weather",
        "labelZh": "天气",
        "order": 20,
        "command": "weather-disaster.openPanel"
      }
    ]
  },
  
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "title": "API Key",
        "description": "Weather API key",
        "default": ""
      },
      "showAlerts": {
        "type": "boolean",
        "title": "Show Disaster Alerts",
        "titleZh": "显示灾害警报",
        "default": true
      }
    },
    "required": ["apiKey"]
  }
}
\`\`\`

## 迁移检查清单

使用以下检查清单确保迁移完整:

- [ ] 添加了 \`permissions\` 字段
- [ ] 测试了所有 API 调用是否有对应权限
- [ ] 将手动 UI 注册迁移到 \`contributes\` 扩展点
- [ ] 添加了 \`configSchema\` 替代手动配置 UI
- [ ] 测试了配置的验证规则
- [ ] 添加了中文翻译(\`labelZh\`、\`titleZh\` 等)
- [ ] 更新了 MOD 版本号
- [ ] 测试了 MOD 在新架构下的功能
- [ ] 更新了 MOD 文档
- [ ] 清理了旧的手动注册代码

## 常见迁移问题

### Q: 迁移后 MOD 无法访问 API,提示权限错误?

A: 检查清单中是否声明了对应的权限:

\`\`\`typescript
// 如果看到这个错误:
// PermissionDeniedError: MOD my-mod does not have permission: time:write

// 在清单中添加:
{
  "permissions": ["time:write"]
}
\`\`\`

### Q: 如何保持与旧版本的兼容性?

A: 使用版本检查:

\`\`\`typescript
export default {
  onEnable(context: ModContext) {
    if (context.apiVersion >= '1.0.0') {
      // 使用新 API
      context.api.time.setCurrentTime(new Date());
    } else {
      // 使用旧 API
      legacySetTime(new Date());
    }
  },
};
\`\`\`

### Q: 迁移后配置丢失了?

A: 配置会自动迁移,但如果配置结构变化,需要提供迁移逻辑:

\`\`\`typescript
export default {
  onEnable(context: ModContext) {
    const config = context.getConfig();
    
    // 迁移旧配置
    if (config.oldField !== undefined) {
      context.updateConfig({
        newField: config.oldField,
      });
    }
  },
};
\`\`\`

### Q: 如何测试迁移后的 MOD?

A: 
1. 在开发环境中启用 MOD
2. 检查控制台是否有权限警告
3. 测试所有功能是否正常
4. 检查配置 UI 是否正确生成
5. 测试扩展点(Dock 图标、命令等)

### Q: 迁移是否会影响性能?

A: 不会。新架构的权限验证开销 < 1ms,对性能影响可忽略不计。

## 迁移时间表

我们建议按以下时间表迁移:

- **立即**: 添加权限声明(最重要)
- **1 个月内**: 迁移 UI 扩展到扩展点
- **2 个月内**: 添加配置 Schema
- **3 个月内**: 使用服务注册表(如果需要)

**重要**: 旧 API 将在 6 个月后开始废弃,12 个月后完全移除。

## 自动化迁移工具

我们提供了自动化迁移工具来简化迁移过程:

\`\`\`bash
# 安装迁移工具
npm install -g @cxic/mod-migration-tool

# 运行迁移
mod-migrate --input ./my-mod --output ./my-mod-migrated

# 验证迁移结果
mod-validate ./my-mod-migrated
\`\`\`

迁移工具会:
- ✅ 分析 MOD 代码,自动推断需要的权限
- ✅ 生成扩展点配置
- ✅ 生成配置 Schema
- ✅ 生成迁移报告

## 获取帮助

如果在迁移过程中遇到问题:

1. 查看[MOD 开发指南](./MOD_DEVELOPMENT_GUIDE.md)
2. 查看[API 参考文档](./API_REFERENCE.md)
3. 在 GitHub 上提交 Issue
4. 加入开发者社区讨论

## 迁移示例代码

完整的迁移示例可以在 \`examples/migration/\` 目录中找到:

- \`examples/migration/before/\`: 迁移前的 MOD
- \`examples/migration/after/\`: 迁移后的 MOD
- \`examples/migration/diff.md\`: 详细的变更对比

祝你迁移顺利! 🚀
