#!/bin/sh
# 九成八发版管理平台 Docker 启动脚本

set -e

echo "🚀 九成八发版管理平台启动中..."

# 等待数据库连接就绪
echo "⏳ 等待数据库连接..."
sleep 3

# 同步数据库结构
echo "📦 同步数据库结构..."
npx prisma db push --skip-generate 2>/dev/null || {
    echo "⚠️ 数据库同步失败，请检查 DATABASE_URL 配置"
}

# 初始化数据（创建角色和管理员账号）
echo "🔧 初始化数据..."
node seed-db.js 2>/dev/null || {
    echo "⚠️ 数据初始化跳过（可能已存在）"
}

echo "✅ 初始化完成，启动应用..."

# 启动 Next.js 应用
exec node server.js
