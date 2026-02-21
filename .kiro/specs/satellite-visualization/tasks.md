# 实施计划: 地球卫星实时可视化系统

## 概述

本实施计划将地球卫星实时可视化系统的设计转换为可执行的开发任务。系统采用前后端分离架构,使用TypeScript、Next.js、Three.js等技术栈,实现50,000+颗卫星的实时3D可视化。

实施策略遵循增量开发原则:
1. 首先建立核心数据层和类型系统
2. 然后实现后端API和数据获取
3. 接着开发SGP4计算引擎
4. 再构建Three.js渲染层
5. 最后完成UI组件和集成

每个任务都包含明确的验收标准和需求追溯,确保实现与设计文档的一致性。

## 任务列表

- [x] 1. 建立项目基础结构和类型系统
  - 创建目录结构: `lib/types/`, `lib/satellite/`, `lib/three/`, `lib/server/`, `lib/store/`, `components/satellite/`, `public/workers/`
  - 定义核心TypeScript类型和接口: `TLEData`, `SatelliteState`, `OrbitalElements`, `OrbitType`, `SatelliteCategory`
  - 创建配置文件 `lib/config/satelliteConfig.ts` 包含API、渲染、计算和UI配置
  - 安装依赖: `satellite.js`, `zustand`, `three` (如果尚未安装)
  - _需求: 10.7, 10.8_

- [ ] 2. 实现后端数据获取服务
  - [x] 2.1 创建Celestrak API客户端
    - 实现 `lib/server/celestrakClient.ts` 包含 `fetchTLE()`, `parseTLE()`, `validateTLE()` 方法
    - 支持所有卫星类别: active, stations, gps-ops, geo, weather, science
    - 实现TLE格式解析和验证逻辑
    - 添加错误重试机制(最多3次)
    - _需求: 1.1, 1.2, 1.8_
  
  - [ ]* 2.2 编写Celestrak客户端的单元测试
    - 测试TLE解析的边界情况
    - 测试无效数据的过滤逻辑
    - 测试错误重试机制
    - _需求: 1.8_
  
  - [x] 2.3 实现Serverless Function API路由
    - 创建 `app/api/satellites/route.ts` 实现GET端点
    - 实现数据缓存逻辑(2小时过期)
    - 实现速率限制(每IP每分钟10次请求)
    - 添加响应头: Last-Modified, Cache-Control
    - 实现错误处理和降级逻辑(返回缓存数据)
    - _需求: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 安全性需求1_
  
  - [ ]* 2.4 编写API路由的集成测试
    - 测试不同类别的数据获取
    - 测试缓存机制
    - 测试速率限制
    - 测试错误处理
    - _需求: 1.1-1.8_

- [x] 3. 检查点 - 后端服务验证
  - 确保API端点可以成功返回卫星数据
  - 验证缓存机制正常工作
  - 如有问题请询问用户

- [ ] 4. 实现SGP4轨道计算引擎
  - [x] 4.1 创建Web Worker for SGP4计算
    - 实现 `public/workers/sgp4.worker.js` 处理批量位置计算
    - 实现消息接口: `WorkerMessage` 和 `WorkerResponse`
    - 使用satellite.js库进行SGP4传播计算
    - 实现错误处理和结果返回
    - _需求: 2.1, 8.1_
  
  - [x] 4.2 实现SGP4Calculator类
    - 创建 `lib/satellite/sgp4Calculator.ts` 实现 `SGP4Calculator` 类
    - 实现 `calculatePositions()` 方法进行批量位置计算
    - 实现 `calculateOrbit()` 方法计算轨道轨迹
    - 实现ECI到Three.js坐标系转换: `(x, y, z)_Three = (x_ECI, z_ECI, -y_ECI) / 1000`
    - 实现SGP4结果缓存机制
    - 实现批量处理逻辑(每批最多1000颗卫星)
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.7, 8.7_
  
  - [ ]* 4.3 编写SGP4计算的属性测试
    - **属性1: 坐标转换一致性**
    - **验证: 需求2.3**
    - 对于任意ECI坐标,转换到Three.js坐标系后再转换回来应得到原始值(在数值精度范围内)
  
  - [ ]* 4.4 编写SGP4计算的单元测试
    - 测试已知TLE数据的位置计算准确性
    - 测试时间范围边界(前后7天)
    - 测试批量计算性能
    - _需求: 2.8, 8.7_

- [ ] 5. 实现卫星渲染器
  - [x] 5.1 创建SatelliteRenderer类
    - 实现 `lib/three/SatelliteRenderer.ts` 的 `SatelliteRenderer` 类
    - 实现 `initPointCloud()` 创建BufferGeometry和PointsMaterial
    - 创建position、color、size三个缓冲区(支持最多100,000颗卫星)
    - 实现 `updatePositions()` 方法批量更新卫星位置、颜色和大小
    - 实现 `getColorByOrbitType()` 根据轨道类型返回颜色(LEO蓝色、MEO绿色、GEO红色、其他白色)
    - 实现 `calculatePointSize()` 根据相机距离计算LOD点大小
    - _需求: 3.1, 3.3, 3.4, 3.6_
  
  - [x] 5.2 实现卫星交互功能
    - 在SatelliteRenderer中实现 `raycast()` 方法进行射线投射检测
    - 实现 `showOrbit()` 方法显示卫星轨道轨迹
    - 实现 `hideOrbit()` 方法隐藏轨道轨迹
    - 限制最多同时显示10条轨道
    - 使用现有的 `OrbitCurve` 类渲染轨道
    - _需求: 5.1, 5.5, 5.6, 5.8, 11.1-11.6_
  
  - [x] 5.3 实现资源管理和优化
    - 实现 `dispose()` 方法清理Three.js资源
    - 实现视锥剔除优化(通过BoundingSphere)
    - 实现对象池复用OrbitCurve对象
    - _需求: 3.5, 8.3, 8.5, 8.6_
  
  - [ ]* 5.4 编写渲染器的单元测试
    - 测试颜色映射逻辑
    - 测试LOD计算
    - 测试轨道数量限制
    - _需求: 3.4, 5.6_

- [ ] 6. 实现场景集成层
  - [x] 6.1 创建SatelliteLayer类
    - 实现 `lib/three/SatelliteLayer.ts` 的 `SatelliteLayer` 类
    - 集成现有的 `SceneManager` 和 `EphemerisSystem`
    - 实现 `update()` 方法每帧更新卫星位置
    - 从EphemerisSystem获取当前时间并转换为Julian Date
    - 实现可见性控制 `setVisible()`
    - 注册到SceneManager的图层系统
    - _需求: 4.1, 4.2, 4.3, 4.6, 4.7_
  
  - [ ]* 6.2 编写场景集成的集成测试
    - 测试与SceneManager的集成
    - 测试与EphemerisSystem的时间同步
    - 测试图层可见性控制
    - _需求: 4.1-4.8_

- [x] 7. 检查点 - 核心渲染功能验证
  - 确保卫星可以在3D场景中正确渲染
  - 验证位置计算和坐标转换的准确性
  - 验证性能达到60fps
  - 如有问题请询问用户

- [ ] 8. 实现状态管理
  - [x] 8.1 创建Zustand卫星状态Store
    - 实现 `lib/store/useSatelliteStore.ts` 的 `SatelliteStore`
    - 定义所有状态: tleData, satellites, loading, error, selectedCategories, searchQuery等
    - 实现 `fetchSatellites()` action调用API获取数据
    - 实现 `updateSatellitePositions()` action更新位置和筛选
    - 实现 `setSelectedCategories()` action处理类别筛选
    - 实现 `setSearchQuery()` action处理搜索
    - 实现 `selectSatellite()` action处理卫星选择
    - 实现 `toggleOrbit()` action处理轨道显示
    - 实现本地存储持久化筛选偏好
    - _需求: 5.1-5.7, 6.1-6.8, 7.1-7.8_
  
  - [ ]* 8.2 编写状态管理的单元测试
    - 测试筛选逻辑
    - 测试搜索逻辑
    - 测试轨道数量限制
    - _需求: 6.1-6.8_

- [ ] 9. 实现UI组件
  - [x] 9.1 创建SatelliteControls组件
    - 实现 `components/satellite/SatelliteControls.tsx`
    - 创建CategoryFilter子组件支持多选类别筛选
    - 创建SearchBar子组件实现实时搜索(300ms防抖)
    - 创建VisibilityToggle子组件控制卫星图层显示/隐藏
    - 创建DataStatus子组件显示数据更新时间、卫星数量和刷新按钮
    - _需求: 6.1-6.8, 7.1-7.3_
  
  - [x] 9.2 创建SatelliteInfoPanel组件
    - 实现 `components/satellite/SatelliteInfoPanel.tsx`
    - 显示选中卫星的基本信息: 名称、NORAD ID、类别、轨道类型
    - 显示轨道参数: 高度、倾角、周期、速度
    - 添加"显示/隐藏轨道"按钮
    - 实现关闭按钮清除选择
    - _需求: 5.2, 5.5, 5.7_
  
  - [x] 9.3 创建SatelliteStats组件
    - 实现 `components/satellite/SatelliteStats.tsx`
    - 显示当前可见卫星数量
    - 显示按类别分组的统计信息
    - 显示性能指标(FPS、渲染时间)
    - _需求: 6.3, 9.6_
  
  - [x] 9.4 创建容器组件SatelliteVisualization
    - 实现 `components/satellite/SatelliteVisualization.tsx`
    - 组合所有子组件
    - 处理组件生命周期和资源清理
    - 实现错误边界(Error Boundary)
    - _需求: 9.4, 9.5_

- [ ] 10. 实现错误处理和日志系统
  - [ ] 10.1 添加全局错误处理
    - 在SatelliteVisualization中实现Error Boundary
    - 实现用户友好的错误消息显示
    - 实现WebGL不可用时的降级提示
    - _需求: 9.1, 9.4, 9.5_
  
  - [ ] 10.2 添加日志和监控
    - 实现性能指标记录(FPS、内存使用、渲染时间)
    - 实现开发者模式显示调试信息
    - 添加控制台日志(开发环境)
    - _需求: 9.2, 9.6, 9.8_

- [ ] 11. 实现性能优化
  - [ ] 11.1 实现分批加载
    - 在useSatelliteStore中实现分批加载逻辑(每批10,000颗)
    - 实现加载进度指示
    - _需求: 8.2_
  
  - [ ] 11.2 实现内存管理
    - 实现内存阈值检测
    - 实现不可见卫星数据的自动释放
    - 实现低性能设备的自动降级
    - _需求: 8.3, 8.8, 3.7_
  
  - [ ]* 11.3 编写性能测试
    - 测试50,000颗卫星的渲染性能
    - 测试内存使用情况
    - 测试批量计算性能
    - _需求: 性能需求1-4_

- [ ] 12. 检查点 - 完整功能验证
  - 确保所有UI组件正常工作
  - 验证交互功能(点击、搜索、筛选)
  - 验证错误处理和降级逻辑
  - 如有问题请询问用户

- [ ] 13. 集成和端到端测试
  - [x] 13.1 集成到现有太阳系系统
    - 在现有的太阳系页面中添加SatelliteVisualization组件
    - 确保与现有UI布局兼容
    - 测试与现有相机控制的协同工作
    - 测试时间系统的同步
    - _需求: 4.1-4.8_
  
  - [ ]* 13.2 编写端到端测试
    - 测试完整的用户流程: 加载数据 → 筛选 → 搜索 → 选择 → 显示轨道
    - 测试数据刷新流程
    - 测试错误恢复流程
    - _需求: 所有功能需求_

- [ ] 14. 优化和打磨
  - [ ] 14.1 性能优化
    - 分析和优化渲染性能瓶颈
    - 优化Web Worker通信开销
    - 优化内存使用
    - _需求: 性能需求1-5_
  
  - [ ] 14.2 UI/UX优化
    - 添加加载动画和过渡效果
    - 优化移动端和平板体验
    - 添加键盘快捷键支持
    - 改进错误提示的用户体验
    - _需求: 7.2, 7.4, 7.8_
  
  - [ ] 14.3 代码质量
    - 添加JSDoc注释到所有公共API
    - 运行ESLint和Prettier格式化
    - 确保TypeScript类型覆盖率100%
    - _需求: 可维护性需求1-3_

- [ ] 15. 最终检查点
  - 运行所有测试确保通过
  - 验证所有需求已实现
  - 检查代码质量和文档完整性
  - 准备部署到生产环境
  - 如有问题请询问用户

## 注意事项

- 标记为 `*` 的任务是可选的测试任务,可以跳过以加快MVP开发
- 每个任务都引用了具体的需求编号,确保可追溯性
- 检查点任务确保增量验证,及早发现问题
- 属性测试验证通用正确性属性,单元测试验证具体示例和边界情况
- 所有Three.js资源必须在组件卸载时正确清理,避免内存泄漏
- Web Worker通信应该是异步的,避免阻塞主线程
- 坐标系转换是关键,必须确保ECI到Three.js的转换正确性

## 技术栈总结

- **前端**: Next.js 16, React 19, TypeScript 5
- **3D渲染**: Three.js 0.170
- **状态管理**: Zustand 5
- **轨道计算**: satellite.js
- **后端**: Vercel Serverless Functions
- **测试**: Jest, React Testing Library
- **代码质量**: ESLint, Prettier, TypeScript

## 预期时间线

- 阶段1 (任务1-3): 后端和数据层 - 2-3天
- 阶段2 (任务4-7): 计算和渲染层 - 3-4天
- 阶段3 (任务8-12): 状态管理和UI - 3-4天
- 阶段4 (任务13-15): 集成和优化 - 2-3天

总计: 10-14天(不包括可选测试任务)
