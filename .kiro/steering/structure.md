# 项目结构

## 目录组织

```
release-platform/
├── prisma/              # 数据库 schema 和迁移
│   └── schema.prisma    # Prisma 数据模型定义
├── public/              # 静态资源
│   ├── logo.png         # 网站 Logo
│   ├── favicon.ico      # 网站图标
│   └── uploads/         # 文件上传目录
├── src/
│   ├── app/             # Next.js App Router 页面和 API
│   │   ├── api/         # API 路由
│   │   │   ├── auth/    # 认证相关 API (login, register, me)
│   │   │   ├── releases/# 发版管理 API
│   │   │   ├── users/   # 用户管理 API
│   │   │   ├── roles/   # 角色 API
│   │   │   ├── dictionary/ # 数据字典 API
│   │   │   └── upload/  # 文件上传 API
│   │   ├── admin/       # 管理后台页面
│   │   │   ├── dictionary/ # 数据字典管理
│   │   │   └── releases/   # 发版记录管理
│   │   ├── dashboard/   # 仪表盘页面
│   │   ├── login/       # 登录页面
│   │   ├── releases/    # 发版列表和详情页面
│   │   ├── users/       # 用户管理页面
│   │   ├── layout.js    # 根布局
│   │   ├── globals.css  # 全局样式（含主题变量）
│   │   └── page.js      # 首页
│   ├── components/      # React 组件
│   │   ├── ChecklistPanel.js  # 检查清单面板
│   │   ├── ConfirmModal.js    # 确认对话框
│   │   ├── FileUpload.js      # 文件上传组件
│   │   ├── Navbar.js          # 导航栏
│   │   ├── ReleaseCard.js     # 发版卡片
│   │   ├── ReleaseSummary.js  # 发版总结组件
│   │   ├── StageProgress.js   # 阶段进度条
│   │   └── ThemeSwitcher.js   # 主题切换组件
│   ├── contexts/        # React Context
│   │   └── ThemeContext.js    # 主题上下文
│   ├── hooks/           # 自定义 React Hooks
│   │   ├── useDictionary.js   # 数据字典 Hook
│   │   └── useRoles.js        # 角色数据 Hook
│   └── lib/             # 工具库
│       ├── auth.js      # 认证工具函数
│       ├── constants.js # 常量定义（阶段、检查清单）
│       └── prisma.js    # Prisma 客户端实例
├── tests/               # Playwright 测试
├── doc/                 # 项目文档
│   ├── 产品需求文档.md
│   ├── 操作手册.md
│   └── 发版规范方案书.md
├── Dockerfile           # Docker 构建文件
├── docker-compose.yml   # Docker Compose 配置
└── .dockerignore        # Docker 忽略文件
```

## 架构模式

### API 路由规范

- 使用 Next.js App Router 的 `route.js` 文件
- RESTful API 设计：GET、POST、PUT、DELETE
- 动态路由使用 `[id]` 目录命名

### 认证机制

- JWT token 存储在 localStorage
- 中间件函数 `verifyToken` 验证请求
- 受保护的页面通过 `useEffect` 检查登录状态

### 数据库访问

- 统一使用 `src/lib/prisma.js` 导出的 Prisma 实例
- 避免在多个地方创建新的 PrismaClient 实例

### 组件规范

- 使用函数式组件和 React Hooks
- 客户端组件需添加 `'use client'` 指令
- 组件文件使用 PascalCase 命名

### 主题系统

- 使用 CSS 变量定义主题颜色
- ThemeContext 管理主题状态
- 支持 light/dark/system 三种模式
- 用户偏好存储在 localStorage

## 关键常量

在 `src/lib/constants.js` 中定义：
- `STAGES`：发版阶段（准备、实施、验证、完成、回滚）
- `PREPARATION_CHECKLIST`：准备阶段检查清单
- `IMPLEMENTATION_CHECKLIST`：实施阶段检查清单
- `VERIFICATION_CHECKLIST`：验证阶段检查清单
- `ROLES`：用户角色定义（PM、RD、QA、PO、DBA、OP）
- `DOCUMENT_TYPES`：文档类型定义
