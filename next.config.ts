import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // 关闭 React Strict Mode，避免 useEffect 执行两次导致事件监听器重复绑定
  reactStrictMode: false,

  // 使用 webpack 而不是 Turbopack（CesiumJS 需要 webpack 配置）
  experimental: {
    turbo: undefined,
  },
};

export default nextConfig;
