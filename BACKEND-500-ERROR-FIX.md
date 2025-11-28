# 后端 API 500 错误修复

[2025-01-27 23:35:00] 修复 `/api/categories` 和 `/api/products` 返回 500 错误的问题

## 🔍 问题描述

前端访问以下 API 端点时返回 500 错误：
- `GET /api/categories` - 分类列表
- `GET /api/products?page=1&limit=12&includeOutOfStock=true` - 产品列表
- `GET /api/products/filters/options?collection=&search=` - 筛选选项

## 🔧 修复内容

### 1. 增强 Prisma Client 初始化配置 (`backend/src/lib/prisma.js`)

**问题**：
- Prisma Client 在生产环境初始化时缺少错误处理
- 没有连接池配置优化
- 缺少启动时的数据库连接测试

**修复**：
- ✅ 添加详细的日志配置（开发环境显示查询日志，生产环境只显示错误）
- ✅ 添加启动时的数据库连接测试（`$connect()`）
- ✅ 添加优雅关闭处理（`SIGTERM`/`SIGINT`）
- ✅ 添加连接错误日志记录

**代码变更**：
```javascript
// [2025-01-27 23:30:00] Enhanced with connection pool and error handling
const prismaConfig = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn', 'info']
    : ['error', 'warn'],
  // ... 配置详情
};

// 测试数据库连接
prisma.$connect()
  .then(() => {
    logger.info('✅ Prisma Client connected to database');
  })
  .catch((error) => {
    logger.error('❌ Failed to connect Prisma Client to database:', error);
  });
```

---

### 2. 改进控制器错误日志 (`backend/src/controllers/*.js`)

**问题**：
- 错误日志只记录 `error` 对象，缺少详细信息
- 无法快速定位 Prisma 错误的具体原因（错误代码、元数据等）

**修复**：
- ✅ 记录详细的错误信息：`message`, `stack`, `code`, `meta`
- ✅ 在开发环境下返回错误详情到客户端（便于调试）

**代码变更**：
```javascript
catch (error) {
  logger.error('[timestamp] listCategories error:', {
    message: error.message,
    stack: error.stack,
    code: error.code,        // Prisma 错误代码（如 P2002, P2025）
    meta: error.meta,        // Prisma 错误元数据
  });
  res.status(500).json({
    error: 'Server Error',
    message: 'Failed to fetch categories',
    ...(process.env.NODE_ENV === 'development' && {
      details: error.message,
    }),
  });
}
```

---

## 📋 后续步骤

### 步骤 1: 等待部署完成

构建已成功完成，等待 Cloud Run 服务更新完成（约 2-5 分钟）。

### 步骤 2: 查看新的错误日志

部署完成后，查看更详细的错误日志：

```bash
# 查看应用日志
gcloud logging read \
  "resource.type=cloud_run_revision AND \
   resource.labels.service_name=print-main-backend AND \
   severity>=ERROR" \
  --limit=10 \
  --project=moonlit-gamma-479502-r6 \
  --format="value(textPayload,jsonPayload.message)"

# 查看 Prisma 连接日志
gcloud logging read \
  "resource.type=cloud_run_revision AND \
   resource.labels.service_name=print-main-backend AND \
   textPayload=~'Prisma|Database'" \
  --limit=20 \
  --project=moonlit-gamma-479502-r6
```

### 步骤 3: 根据错误日志进一步诊断

可能的错误原因：

1. **数据库连接问题**
   - `DATABASE_URL` Secret 值不正确
   - 数据库服务器不可访问
   - SSL 连接配置问题

2. **Prisma Schema 与数据库不同步**
   - 需要运行数据库迁移
   - 数据库表缺失或不匹配

3. **Prisma Client 生成问题**
   - `prisma generate` 未正确执行
   - Schema 文件路径不正确

---

## 🔍 诊断命令

### 检查数据库连接

```bash
# 检查 DATABASE_URL Secret
gcloud secrets versions access latest \
  --secret=database-url \
  --project=moonlit-gamma-479502-r6 | head -c 50
```

### 检查 Prisma Client 生成

查看构建日志，确认 `prisma generate` 是否成功执行。

### 检查数据库迁移

查看服务器启动日志，确认迁移是否成功执行。

---

## ✅ 验证

部署完成后，访问前端页面，检查：
1. 分类列表是否正常加载
2. 产品列表是否正常显示
3. 筛选选项是否正常工作

如果问题仍然存在，新的详细错误日志将帮助我们定位具体原因。

---

**最后更新**: 2025-01-27 23:35:00

