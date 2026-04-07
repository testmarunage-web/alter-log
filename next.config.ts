import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // ⚠️ ビルド時のTypeScriptエラーを無視する
    ignoreBuildErrors: true,
  },
  experimental: {
    // dynamic ページのルーターキャッシュを無効化（force-dynamic と組み合わせて確実にキャッシュを回避）
    staleTimes: {
      dynamic: 0,
    },
  },
  async rewrites() {
    return [
      {
        // /__clerk/:path* → /api/clerk-proxy/:path*（Route Handlerに転送）
        source: "/__clerk/:path*",
        destination: "/api/clerk-proxy/:path*",
      },
    ];
  },
};

export default nextConfig;