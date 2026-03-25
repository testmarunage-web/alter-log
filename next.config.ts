import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // ⚠️ ビルド時のTypeScriptエラーを無視する
    ignoreBuildErrors: true,
  },
};

export default nextConfig;