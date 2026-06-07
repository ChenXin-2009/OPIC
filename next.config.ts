import type { NextConfig } from "next";
import CopyWebpackPlugin from 'copy-webpack-plugin';
import path from 'path';
import packageJson from './package.json';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // 关闭 React Strict Mode，避免 useEffect 执行两次导致事件监听器重复绑定
  reactStrictMode: false,
  
  // 添加空 turbopack 配置以消除警告
  turbopack: {},
  
  // 环境变量 - 从 package.json 读取版本号
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  
  // Cesium 配置
  webpack: (config, { isServer }) => {
    // 配置 Cesium 静态资源
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        cesium: 'cesium/Build/Cesium/Cesium.js',
      };
      
      // 复制 Cesium 静态资源到 public 目录
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Workers'),
              to: path.join(__dirname, 'public/cesium/Workers'),
            },
            {
              from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/ThirdParty'),
              to: path.join(__dirname, 'public/cesium/ThirdParty'),
            },
            {
              from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Assets'),
              to: path.join(__dirname, 'public/cesium/Assets'),
            },
            {
              from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Widgets'),
              to: path.join(__dirname, 'public/cesium/Widgets'),
            },
          ],
        })
      );
    }
    
    return config;
  },
};

export default nextConfig;
