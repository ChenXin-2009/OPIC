const fs = require('fs');
const msg = fs.readFileSync(0, 'utf-8').trim();
const commit = process.env.GIT_COMMIT || '';

const hashRewrites = {
  '2899587035a9bb16f74eca9f979c610c74573037': 'Release 1.2.0: 项目初始化',
  'f65aaa7dced636f796c45a888c7abf8a0cae9cdc': 'Release 9.2.4.1: 添加多语言README及翻译脚本',
  'acfcf4ab20396f8908d330ccd50c91fdf35aed21': 'Release 6.6.1: 添加Cesium地球瓦片地图集成测试',
  'b7bc7602cefd517836684b6be9179e032de6cfb0': 'Release 6.5.4.1: 修复卫星搜索功能及菜单组件',
  'df1a2d2e500d8a71cc5eebe60f3a9d672d4d08aa': 'Release 5.3.1: 重构宇宙标签配置和数据加载',
  '43974a0354aee57b87f98566b68c745bd075ba9a': 'Release 4.6.1.1: 重构UI设置（时间控制、恒星亮度、Gaia星表）',
  '907d9cbbab0c411ebb670251b4f697de1b4f9feb': 'Release 4.3.1: 集成BSC星表数据',
  '10e36c6a5711ef69ae1c030881494bef82cf6c19': 'Release 3.4.4.1: 修复行星自转时钟同步问题',
  '3b13a3d88d79ec4f6026c297082d7d1763473738': 'Release 3.5.0.1: 实现行星自转系统（轴倾角、卫星轨道）',
  'ddfbdbdfa7bd103c2f1fabaa62481a2afbbeffb5': 'Release 3.2.0.1: 重构行星纹理渲染系统',
};

if (hashRewrites[commit]) {
  console.log(hashRewrites[commit]);
} else {
  console.log(msg);
}
