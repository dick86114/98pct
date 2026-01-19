#!/bin/bash

# 移动端导航栏优化 - 重新构建 Docker 镜像

echo "🛑 停止并删除旧容器..."
docker stop 98pct 2>/dev/null && docker rm 98pct 2>/dev/null

echo "🏗️  重新构建 Docker 镜像..."
cd release-platform
docker build -t 98pct:local -f Dockerfile .

if [ $? -eq 0 ]; then
    echo "✅ 镜像构建成功！"
    echo "🚀 启动新容器..."
    docker run -d --name 98pct -p 9898:3000 --env-file .env -v $(pwd)/uploads:/app/public/uploads 98pct:local
    
    if [ $? -eq 0 ]; then
        echo "✅ 容器启动成功！"
        echo "📱 访问地址: http://localhost:9898"
        echo ""
        echo "移动端导航栏优化内容："
        echo "  ✓ 隐藏 Logo 文字，只显示图标"
        echo "  ✓ 隐藏反馈按钮文字"
        echo "  ✓ 隐藏用户信息详细内容"
        echo "  ✓ 优化间距和尺寸"
        echo "  ✓ 导航栏高度从 64px 减少到 56px"
    else
        echo "❌ 容器启动失败！"
        exit 1
    fi
else
    echo "❌ 镜像构建失败！"
    exit 1
fi
