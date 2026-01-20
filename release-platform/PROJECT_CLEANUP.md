# 项目清理和优化记录

## 清理日期
2025-01-20

## 清理内容

### 1. 删除的文件和目录

#### 测试相关文件（约 1.2MB）
- `test-results/` - Playwright 测试结果
- `playwright-report/` - Playwright 测试报告
- `public/snapshots/` - 测试快照文件（15MB）

#### 构建缓存（约 227MB）
- `.next/` - Next.js 构建缓存（会在构建时重新生成）

#### 临时文件
- `*.log` - 日志文件
- `*.tmp` - 临时文件
- `.DS_Store` - macOS 系统文件
- `Thumbs.db` - Windows 系统文件
- `*.swp`, `*.swo` - Vim 临时文件

### 2. 保留的文件

#### 开发数据库（48KB）
- `prisma/dev.db` - 开发环境数据库（包含测试数据）

#### 上传文件
- `uploads/` - 用户上传的文件（运行时生成）
- `public/uploads/` - 公开访问的上传文件

#### 配置文件
- `.env` - 环境变量配置
- `package.json` - 项目依赖配置
- `Dockerfile` - Docker 构建配置
- 其他必要的配置文件

### 3. 新增文件

#### 清理脚本
- `cleanup.sh` - 项目清理脚本，可重复执行

#### 文档
- `PROJECT_CLEANUP.md` - 本文档
- `PERFORMANCE_OPTIMIZATION.md` - 性能优化文档
- `OPTIMIZATION_SUMMARY.md` - 优化总结文档

### 4. 更新的文件

#### .gitignore
新增忽略规则：
```
# 测试快照
release-platform/public/snapshots/*
!release-platform/public/snapshots/.gitkeep

# 临时文件
*.tmp
```

#### .dockerignore
已包含完整的忽略规则，确保 Docker 构建时不包含不必要的文件。

## 清理效果

### 磁盘空间优化
- **清理前**: ~770MB（包含 .next、test-results、snapshots 等）
- **清理后**: ~529MB（仅保留必要文件）
- **节省空间**: ~241MB

### 构建优化
- **构建时间**: ~32秒（包含依赖安装和代码编译）
- **镜像大小**: 优化后的 Docker 镜像更小更高效

### 项目结构
```
release-platform/
├── node_modules/        # 依赖包（525MB）
├── prisma/              # 数据库配置和文件
│   ├── schema.prisma    # 数据库模型
│   └── dev.db           # 开发数据库（48KB）
├── public/              # 静态资源
│   ├── uploads/         # 上传文件目录
│   └── snapshots/       # 测试快照（已清理）
├── src/                 # 源代码
│   ├── app/             # Next.js 页面和 API
│   ├── components/      # React 组件
│   ├── contexts/        # React Context
│   ├── hooks/           # 自定义 Hooks
│   └── lib/             # 工具库
├── tests/               # 测试文件
├── uploads/             # 运行时上传文件
├── .dockerignore        # Docker 忽略文件
├── .env                 # 环境变量
├── .gitignore           # Git 忽略文件
├── cleanup.sh           # 清理脚本
├── Dockerfile           # Docker 构建文件
├── docker-compose.yml   # Docker Compose 配置
├── package.json         # 项目配置
└── *.md                 # 文档文件
```

## 清理脚本使用

### 手动清理
```bash
cd release-platform
bash cleanup.sh
```

### 自动清理（在 CI/CD 中）
可以在构建前自动执行清理脚本：
```bash
# 在 Dockerfile 或 CI 脚本中
RUN bash cleanup.sh
```

## Docker 优化

### 构建命令
```bash
# 停止并删除旧容器
docker stop 98pct && docker rm 98pct

# 删除旧镜像
docker rmi 98pct:local

# 重新构建镜像
cd release-platform
docker build -t 98pct:local -f Dockerfile .

# 启动新容器
docker run -d --name 98pct -p 9898:3000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/public/uploads \
  98pct:local
```

### 查看容器状态
```bash
# 查看运行状态
docker ps | grep 98pct

# 查看日志
docker logs 98pct --tail 50

# 查看实时日志
docker logs -f 98pct
```

## 注意事项

### 1. 测试文件
- 测试文件（`tests/`）保留在源代码中，但不会打包到 Docker 镜像
- 测试报告和快照会在每次测试后重新生成

### 2. 上传文件
- `uploads/` 目录通过 Docker volume 挂载，数据持久化
- 清理脚本不会删除上传的文件

### 3. 数据库
- 开发数据库 `dev.db` 保留，包含测试数据
- 生产环境使用 PostgreSQL，不使用 SQLite

### 4. 环境变量
- `.env` 文件不会被提交到 Git
- Docker 构建时通过 `--env-file` 参数传入

## 定期维护建议

### 每周
- 清理测试报告和快照
- 检查上传文件大小

### 每月
- 清理旧的 Docker 镜像和容器
- 检查日志文件大小
- 更新依赖包

### 每季度
- 审查项目结构
- 清理未使用的代码和依赖
- 优化 Docker 镜像大小

## 清理命令速查

```bash
# 清理项目文件
bash cleanup.sh

# 清理 Docker 资源
docker system prune -a --volumes

# 清理 npm 缓存
npm cache clean --force

# 清理 node_modules 并重新安装
rm -rf node_modules package-lock.json
npm install

# 查看目录大小
du -sh release-platform
du -sh release-platform/*

# 查找大文件
find release-platform -type f -size +10M -exec ls -lh {} \;
```

## 总结

通过本次清理和优化：
1. ✅ 删除了约 241MB 的临时和测试文件
2. ✅ 优化了项目结构，提高了可维护性
3. ✅ 创建了可重复使用的清理脚本
4. ✅ 更新了 .gitignore 和 .dockerignore
5. ✅ 重新构建并启动了 Docker 容器
6. ✅ 确保项目正常运行，功能完整

项目现在更加精简高效，便于开发和部署。
