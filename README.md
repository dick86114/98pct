# 九成八发版管理平台

一个用于规范化软件发布流程的协作平台，帮助团队高效管理发版过程。

## 更新日志

### v1.0.0 (2026-01-15)
- 🎉 首次发布
- ✨ 支持 ADMIN/PM/RD/QA/PO/DBA/OP 七种角色协作
- ✨ 发版三阶段流程：准备 → 实施 → 验证
- ✨ 检查清单机制，确保发版质量
- ✨ 文档上传与管理
- ✨ 发版总结与 Excel 导出
- ✨ 支持浅色/深色/跟随系统主题
- ✨ GitHub Actions 自动构建 Docker 镜像

---

## 平台介绍

### 核心功能

- **发版管理**：创建、跟踪和管理软件版本发布
- **角色协作**：支持多角色协同工作，权限分明
- **三阶段流程**：准备阶段 → 实施阶段 → 验证阶段
- **检查清单**：发版各阶段的任务检查与确认机制
- **文档管理**：上传和管理发版相关文档
- **成员管理**：发版团队成员分配与内容填写
- **发版总结**：完成后生成发版总结，支持导出 Excel

### 角色职责

| 角色 | 职责 |
|------|------|
| ADMIN | 系统管理、用户管理、数据字典管理、查看所有发版记录 |
| PM | 流程协调、进度监控、阶段推进、管理自己发起的发版 |
| RD | 代码开发、变更填报、自测确认 |
| QA | 功能测试、测试报告、测试确认 |
| PO | 产品验收、验收报告、验收确认 |
| DBA | 数据库审核、脚本执行、执行结果填报 |
| OP | 备份工作、回滚方案、运维确认 |

### 发版流程

```
准备阶段 → 实施阶段 → 验证阶段 → 完成/回滚
```

1. **准备阶段**：代码提交、功能测试、产品验收、DBA 审核、运维备份
2. **实施阶段**：备份确认、停服、变更执行、启动自检、DBA 执行结果填报
3. **验证阶段**：功能验证、产品验收、持续观察
4. **完成/回滚**：发版成功或执行回滚

## Docker 部署

### 前置要求

- Docker 20.10+
- Docker Compose v2+
- PostgreSQL 数据库

### 快速部署

1. **创建部署目录**

```bash
mkdir 98pct && cd 98pct
```

2. **创建 docker-compose.yml**

```yaml
services:
  98pct:
    # 使用 Docker Hub 镜像（推荐，国内访问更快）
    image: dick86114/98pct:latest
    # 或使用 GitHub Container Registry 镜像
    # image: ghcr.io/dick86114/98pct:latest
    container_name: 98pct
    ports:
      - "9898:3000"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    volumes:
      - ./uploads:/app/public/uploads
    restart: unless-stopped
    network_mode: bridge
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**镜像地址：**
- Docker Hub: `dick86114/98pct:latest`（推荐）
- GHCR: `ghcr.io/dick86114/98pct:latest`

3. **创建环境变量文件 `.env`**

```bash
# 数据库连接（请修改为你的数据库地址）
DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/数据库名"

# JWT 密钥（请修改为随机字符串）
JWT_SECRET="your-secret-key-change-this"
```

4. **启动服务**

```bash
# 拉取最新镜像
docker compose pull

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

容器启动时会自动完成以下初始化：
- 同步数据库结构
- 创建角色数据
- 创建默认管理员账号

5. **默认管理员账号**

初始化完成后，系统会自动创建一个超级管理员账号：

| 项目 | 值 |
|------|------|
| 用户名 | `admin` |
| 密码 | `admin123` |
| 邮箱 | `admin@98pct.com` |

> ⚠️ **安全提示**：首次登录后请立即修改默认密码！

### 访问平台

部署完成后访问：http://你的服务器IP:9898

### 更新部署

```bash
# 拉取最新镜像
docker compose pull

# 重启服务
docker compose up -d
```

### 数据持久化

- 上传的文件存储在 `./uploads` 目录
- 数据库数据存储在 PostgreSQL 中

## 技术栈

- **前端**：Next.js 14 + React 18
- **后端**：Next.js API Routes
- **数据库**：PostgreSQL + Prisma ORM
- **认证**：JWT
- **容器化**：Docker + GitHub Actions 自动构建

## 开发环境

```bash
cd release-platform
pnpm install
pnpm dev
```

## License

MIT
