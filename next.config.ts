/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ⚠️ ビルド時のESLintエラーを無視する
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ⚠️ ビルド時のTypeScriptエラーを無視する
    ignoreBuildErrors: true,
  },
};

export default nextConfig;