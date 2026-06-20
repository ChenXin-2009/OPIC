import type { NextConfig } from "next";
import CopyWebpackPlugin from 'copy-webpack-plugin';
import path from 'path';
import packageJson from './package.json';

// Bundle Analyzer
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config: NextConfig) => config;

const nextConfig: NextConfig = withBundleAnalyzer({
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

  // 性能优化：减少不必要的实验性功能
  experimental: {
    optimizePackageImports: ['three', 'cesium', 'framer-motion'],
  },
  
  // Cesium 配置
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
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

      // Bundle 分析优化：将大型库拆分为独立 chunk
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            three: {
              test: /[\\/]node_modules[\\/]three[\\/]/,
              name: 'vendor-three',
              priority: 20,
            },
            cesium: {
              test: /[\\/]node_modules[\\/](cesium|@cesium)[\\/]/,
              name: 'vendor-cesium',
              priority: 20,
            },
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: 'vendor-framer-motion',
              priority: 10,
            },
          },
        },
      };
    }
    
    return config;
  },
});

export default nextConfig;
