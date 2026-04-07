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
        // /__clerk/:path* → https://clerk.alter-log.com/:path*（/__clerk プレフィックスを除去して転送）
        source: "/__clerk/:path*",
        destination: "https://clerk.alter-log.com/:path*",
      },
    ];
  },
};

export default nextConfig;