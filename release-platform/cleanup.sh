#!/bin/bash

# 项目清理脚本
# 清理测试文件、构建缓存和临时文件

echo "🧹 开始清理项目..."

# 清理测试报告
if [ -d "test-results" ]; then
    echo "📁 清理测试结果..."
    rm -rf test-results
fi

if [ -d "playwright-report" ]; then
    echo "📁 清理 Playwright 报告..."
    rm -rf playwright-report
fi

# 清理测试快照（保留 .gitkeep）
if [ -d "public/snapshots" ]; then
    echo "📁 清理测试快照..."
    find public/snapshots -type f ! -name '.gitkeep' -delete
fi

# 清理构建缓存
if [ -d ".next" ]; then
    echo "📁 清理 Next.js 构建缓存..."
    rm -rf .next
fi

# 清理日志文件
echo "📁 清理日志文件..."
find . -name "*.log" -type f -delete
find . -name "npm-debug.log*" -type f -delete

# 清理临时文件
echo "📁 清理临时文件..."
find . -name ".DS_Store" -type f -delete
find . -name "Thumbs.db" -type f -delete
find . -name "*.tmp" -type f -delete
find . -name "*.swp" -type f -delete
find . -name "*.swo" -type f -delete

echo "✅ 清理完成！"
echo ""
echo "📊 当前目录大小："
du -sh .
