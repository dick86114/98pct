# 九成八发版管理平台 Docker 镜像
# 多阶段构建优化镜像大小

# ==================== 基础镜像 ====================
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat openssl openssl-dev
WORKDIR /app

# ==================== 依赖安装阶段 ====================
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# ==================== 构建阶段 ====================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置构建时环境变量（用于 Prisma 生成）
ENV NEXT_TELEMETRY_DISABLED=1

# 生成 Prisma Client
RUN npx prisma generate

# 构建 Next.js 应用
RUN npm run build

# ==================== 生产运行阶段 ====================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# 设置 standalone 输出目录权限
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制 Prisma 生成的客户端
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# 创建上传目录并设置权限
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node", "server.js"]
