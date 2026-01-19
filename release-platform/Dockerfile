# 今天发什么发版管理平台 Docker 镜像
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

# 复制 Prisma 相关文件（客户端、CLI、引擎）
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# 复制 bcryptjs（seed-db.js 需要）
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# 复制初始化脚本
COPY --from=builder /app/seed-db.js ./seed-db.js
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

# 创建上传目录并设置权限（777 确保挂载 volume 时也能写入）
RUN mkdir -p /app/public/uploads && \
    chown -R nextjs:nodejs /app/public/uploads && \
    chmod -R 777 /app/public/uploads
RUN chmod +x /app/docker-entrypoint.sh

# 创建一个启动包装脚本，在切换用户前设置权限
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'mkdir -p /app/public/uploads' >> /app/start.sh && \
    echo 'chmod -R 777 /app/public/uploads' >> /app/start.sh && \
    echo 'chown -R nextjs:nodejs /app/public/uploads 2>/dev/null || true' >> /app/start.sh && \
    echo 'su-exec nextjs:nodejs /app/docker-entrypoint.sh' >> /app/start.sh && \
    chmod +x /app/start.sh

# 安装 su-exec（用于切换用户）
USER root
RUN apk add --no-cache su-exec

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# 添加 node_modules/.bin 到 PATH
ENV PATH="/app/node_modules/.bin:$PATH"

# 使用启动脚本（自动初始化数据库）
CMD ["/app/start.sh"]
