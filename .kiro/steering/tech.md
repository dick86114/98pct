# 技术栈

## 框架与库

- **Next.js 14.2.3**：React 全栈框架，使用 App Router
- **React 18.3.1**：前端 UI 框架
- **Prisma 5.14.0**：ORM 数据库工具
- **PostgreSQL**：生产数据库
- **bcryptjs**：密码加密
- **jsonwebtoken**：JWT 认证
- **react-hot-toast**：消息提示组件
- **Playwright**：端到端测试框架

## 常用命令

### 开发环境

```bash
cd release-platform
pnpm install              # 安装依赖
pnpm dev                  # 启动开发服务器 (监听 0.0.0.0)
```

### 数据库

```bash
npx prisma generate       # 生成 Prisma Client
npx prisma db push        # 同步数据库 schema
npx prisma studio         # 打开数据库管理界面
node seed-db.js           # 初始化数据库数据
node create-user.js       # 创建用户
```

### 构建与部署

```bash
pnpm build                # 构建生产版本
pnpm start                # 启动生产服务器
```

### 测试

```bash
pnpm test                 # 运行 Playwright 测试
pnpm test:ui              # 运行测试 UI 模式
pnpm test:headed          # 运行有头模式测试
```

## 环境变量

需要在 `.env` 文件中配置：
- `DATABASE_URL`：数据库连接字符串
- `JWT_SECRET`：JWT 密钥

## 包管理器

项目使用 **pnpm** 作为包管理器，不要使用 npm 或 yarn。
