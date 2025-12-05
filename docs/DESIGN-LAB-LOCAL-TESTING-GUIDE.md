# Design Lab 本地测试准备指南

**创建时间**: 2025-01-30 23:55:00  
**用途**: 在本地服务器测试 Design Lab 功能的完整准备步骤

---

## 快速开始

### 一键启动（推荐）

```bash
# 使用快速启动脚本
./scripts/start-dev.sh
```

这将自动：
- 检查并安装依赖
- 检查环境变量配置
- 启动后端服务器（端口 3001）
- 启动前端服务器（端口 3000）
- 访问 Design Lab: http://localhost:3000/design-lab

---

## 详细准备步骤

### 1. 环境要求

- ✅ Node.js 18+ （当前: v25.2.1）
- ✅ npm 9+ （当前: 11.6.2）
- ✅ PostgreSQL 数据库（本地或远程）

### 2. 依赖安装

```bash
# 根目录安装所有 workspace 依赖
npm install
```

依赖已自动安装到：
- `node_modules/` - 根目录依赖
- `backend/node_modules/` - 后端依赖
- `apps/web/node_modules/` - 前端依赖

### 3. 数据库配置

#### 3.1 数据库准备

**选项 A：本地 PostgreSQL**
```bash
createdb suvernireplus
```

**选项 B：远程数据库（Neon/Supabase）**
- 获取连接字符串：`postgresql://user:password@host/dbname?sslmode=require`
- 在 `backend/.env` 中配置 `DATABASE_URL`

#### 3.2 运行数据库迁移

```bash
# 方式 1：使用脚本（推荐）
./scripts/db-migrate.sh

# 方式 2：手动执行
cd backend
npm run prisma:migrate  # Prisma 迁移
npm run db:migrate      # Sequelize 迁移
```

### 4. 后端配置

#### 4.1 环境变量

后端 `.env` 文件已存在，确保以下关键变量已配置：

**必需配置**：
- `DATABASE_URL` - PostgreSQL 连接字符串
- `JWT_SECRET` - JWT 密钥（任意强密码）
- `FRONTEND_URL` - 前端地址（默认 `http://localhost:3000`）
- `CORS_ORIGINS` - CORS 允许的源（默认 `http://localhost:3000`）

**可选配置**（Design Lab 功能需要）：
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET` - 如果使用 S3 上传
- `ALIYUN_OSS_*` - 如果使用阿里云 OSS 上传
- `STRIPE_SECRET_KEY` - 如果需要报价功能（测试密钥即可）

#### 4.2 启动后端

```bash
cd backend
npm run dev
# 后端将在 http://localhost:3001 启动
# API 端点：http://localhost:3001/api
```

**验证后端**：
```bash
# 检查健康状态
curl http://localhost:3001/api/health

# 检查产品列表
curl http://localhost:3001/api/products?page=1&limit=5
```

### 5. 前端配置

#### 5.1 环境变量

前端 `.env.local` 文件已配置：

```env
# API 配置（指向本地后端）
NEXT_PUBLIC_API_URL=http://localhost:3001
API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

#### 5.2 启动前端

```bash
cd apps/web
npm run dev
# 前端将在 http://localhost:3000 启动
```

**访问 Design Lab**：
- 浏览器打开：`http://localhost:3000/design-lab`

---

## Design Lab 数据准备

### 6.1 产品数据

Design Lab 需要产品数据用于：
- 产品选择（Change Product）
- 产品颜色选择（Product Colors）
- 产品预览图片（Front/Back/Sleeve）

**准备产品数据**：
```bash
cd backend

# 方式 1：使用种子脚本（推荐）
node scripts/seed-demo.js        # 创建分类、品牌、产品
node scripts/seed-variants.js   # 创建产品变体（库存数据）

# 方式 2：使用完整测试数据
node scripts/seed-full-test-data.js

# 方式 3：使用 Prisma seed
npm run db:seed
```

**检查产品数据**：
```bash
# 检查 API 是否返回产品
curl http://localhost:3001/api/products?page=1&limit=1
```

### 6.2 艺术库数据

Design Lab 的 "Add Art" 功能需要艺术素材数据。

**检查艺术库**：
```bash
# 检查 API 是否返回艺术素材
curl http://localhost:3001/api/art-assets
```

**准备艺术库数据**：

目前没有自动种子脚本，需要通过以下方式添加：

1. **通过 Admin 面板上传**：
   - 访问：http://localhost:3000/admin/art-assets
   - 登录管理员账户
   - 上传艺术素材图片

2. **手动插入数据库**：
   ```sql
   INSERT INTO art_assets (id, category, name, image_url, is_active, created_at, updated_at)
   VALUES 
     (gen_random_uuid(), 'Shapes', 'Circle', 'https://example.com/circle.png', true, NOW(), NOW()),
     (gen_random_uuid(), 'Shapes', 'Square', 'https://example.com/square.png', true, NOW(), NOW());
   ```

3. **使用 API 创建**（需要认证）：
   ```bash
   POST http://localhost:3001/api/admin/art-assets
   ```

**艺术库分类建议**：
- Emojis（表情符号）
- Shapes（形状）
- Animals（动物）
- Text（文字）
- Logos（标志）
- Patterns（图案）

### 6.3 文件上传配置

如果 Design Lab 需要上传用户图片：

**本地存储**（开发环境推荐）：
- 检查 `backend/uploads/` 目录是否存在
- 确保有写入权限
- 上传的文件将存储在本地

**S3 配置**（如果使用）：
- 在 `backend/.env` 配置 AWS 凭证
- 确保 S3 bucket 存在且有正确权限

**OSS 配置**（如果使用）：
- 在 `backend/.env` 配置阿里云 OSS 凭证

---

## 功能验证清单

### 基础功能
- [ ] 页面可以正常加载（无 404）
- [ ] 画布可以正常显示
- [ ] 左侧 Rail 工具栏显示正常
- [ ] 右侧视图切换面板显示正常
- [ ] 底部操作栏显示正常

### 核心功能
- [ ] Upload 功能（上传图片）
- [ ] Add Text 功能（添加文本）
- [ ] Add Art 功能（选择艺术素材）- **需要艺术库数据**
- [ ] Product Colors 功能（切换产品颜色）- **需要产品数据**
- [ ] 视图切换（Front/Back/Sleeve）
- [ ] 保存设计（Save）
- [ ] 获取报价（Get Price）

### API 端点验证

```bash
# 设计草稿 API
POST http://localhost:3001/api/designs
GET http://localhost:3001/api/designs/:id

# 产品 API
GET http://localhost:3001/api/products
GET http://localhost:3001/api/products/:slug

# 艺术库 API
GET http://localhost:3001/api/art-assets

# 报价 API
POST http://localhost:3001/api/designs/:id/quote
```

---

## 常见问题排查

### 问题 1：前端无法连接后端

**症状**：浏览器控制台显示 API 请求失败

**解决方法**：
1. 检查后端是否在 3001 端口运行：`curl http://localhost:3001/api/health`
2. 检查 `apps/web/.env.local` 中的 `NEXT_PUBLIC_API_URL`
3. 检查浏览器控制台的 API 请求 URL
4. 检查 CORS 配置：确保 `backend/.env` 中 `CORS_ORIGINS` 包含 `http://localhost:3000`

### 问题 2：Design Lab 页面 404

**症状**：访问 `/design-lab` 返回 404

**解决方法**：
1. 检查 `apps/web/src/app/design-lab/page.tsx` 是否存在
2. 重启前端开发服务器
3. 清除浏览器缓存（Cmd+Shift+R 或 Ctrl+Shift+R）
4. 检查 Next.js 编译错误

### 问题 3：产品/艺术库数据为空

**症状**：Design Lab 中无法选择产品或艺术素材

**解决方法**：
1. 运行种子脚本：`cd backend && node scripts/seed-demo.js`
2. 检查数据库连接：`curl http://localhost:3001/api/products`
3. 检查 API 端点是否返回数据
4. 查看后端日志错误信息

### 问题 4：文件上传失败

**症状**：上传图片时出错

**解决方法**：
1. 检查 `backend/uploads/` 目录是否存在且有写入权限
2. 检查文件上传配置（S3/OSS/本地）
3. 查看后端日志错误信息
4. 检查文件大小限制（默认 50MB）

### 问题 5：画布无法显示

**症状**：Design Lab 页面加载但画布区域空白

**解决方法**：
1. 检查浏览器控制台是否有 JavaScript 错误
2. 检查 Fabric.js 是否正确加载
3. 检查产品数据是否存在（画布需要产品预览图）
4. 尝试刷新页面或清除缓存

---

## 快速检查脚本

创建一个检查脚本 `scripts/check-design-lab-setup.sh`：

```bash
#!/bin/bash
echo "检查 Design Lab 本地测试环境..."

# 检查 Node.js
echo -n "Node.js: "
node --version

# 检查依赖
echo -n "根目录依赖: "
[ -d "node_modules" ] && echo "✅" || echo "❌"

# 检查后端配置
echo -n "后端 .env: "
[ -f "backend/.env" ] && echo "✅" || echo "❌"

# 检查前端配置
echo -n "前端 .env.local: "
[ -f "apps/web/.env.local" ] && echo "✅" || echo "❌"

# 检查后端服务
echo -n "后端服务 (3001): "
curl -s http://localhost:3001/api/health > /dev/null && echo "✅" || echo "❌ (未运行)"

# 检查前端服务
echo -n "前端服务 (3000): "
curl -s http://localhost:3000 > /dev/null && echo "✅" || echo "❌ (未运行)"

# 检查产品数据
echo -n "产品数据: "
curl -s http://localhost:3001/api/products?page=1&limit=1 | grep -q "data" && echo "✅" || echo "❌ (无数据)"

# 检查艺术库数据
echo -n "艺术库数据: "
curl -s http://localhost:3001/api/art-assets | grep -q "data" && echo "✅" || echo "❌ (无数据)"
```

---

## 参考文档

- [README.md](../README.md) - 项目快速开始
- [docs/LOCAL_TESTING_NOTES.md](LOCAL_TESTING_NOTES.md) - 本地测试笔记
- [docs/DESIGN-LAB-ROUTE-CONFIGURATION.md](DESIGN-LAB-ROUTE-CONFIGURATION.md) - Design Lab 路由配置
- [docs/DESIGN-LAB-GAP-ANALYSIS.md](DESIGN-LAB-GAP-ANALYSIS.md) - Design Lab 功能对比分析
- [backend/env.example](../backend/env.example) - 后端环境变量模板

---

**最后更新**: 2025-01-30 23:55:00

