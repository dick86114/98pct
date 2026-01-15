#!/bin/sh
# 九成八发版管理平台 Docker 启动脚本

echo "🚀 九成八发版管理平台启动中..."

# 等待数据库连接就绪（最多等待 30 秒）
echo "⏳ 等待数据库连接..."
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if node /app/node_modules/prisma/build/index.js db push --skip-generate > /dev/null 2>&1; then
        echo "✅ 数据库连接成功，结构已同步"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "⏳ 等待数据库就绪... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 3
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "⚠️ 数据库连接超时，尝试直接启动应用..."
    echo "   请确保 DATABASE_URL 配置正确"
else
    # 初始化数据（创建角色和管理员账号）
    echo "🔧 初始化数据..."
    if node seed-db.js 2>&1; then
        echo "✅ 数据初始化完成"
    else
        echo "ℹ️ 数据初始化跳过（可能已存在）"
    fi
fi

echo "✅ 启动应用..."

# 启动 Next.js 应用
exec node server.js
