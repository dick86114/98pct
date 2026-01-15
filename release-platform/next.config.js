/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 standalone 输出模式，用于 Docker 部署
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
};

module.exports = nextConfig;
