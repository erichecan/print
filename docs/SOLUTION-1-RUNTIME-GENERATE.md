# 方案 1：回退到运行时生成 Prisma Client
# [2025-01-29 17:30:00]

## 实施内容

### 1. 恢复 Dockerfile

**文件**: `backend/Dockerfile`

**修改**:
- ✅ 移除构建时的 `prisma generate` 步骤（第 21-40 行）
- ✅ 移除占位符 `DATABASE_URL` 环境变量
- ✅ 移除所有 `PRISMA_*` 环境变量
- ✅ 恢复注释："跳过构建时的 Prisma generate"

**恢复后的配置**:
```dockerfile
## [2025-01-29 17:30:00] 跳过构建时的 Prisma generate（回到运行时生成方式）
## Prisma Client 将在运行时由 server.js 生成（使用真实的 DATABASE_URL）
# RUN npx prisma generate --schema=./prisma/schema.prisma
```

### 2. 简化 schema.prisma

**文件**: `prisma/schema.prisma`

**修改**:
- ✅ 移除 `binaryTargets = ["native", "debian-openssl-3.0.x"]`
- ✅ 移除 `previewFeatures = []`
- ✅ 保留最简单的配置

**恢复后的配置**:
```prisma
generator client {
  provider = "prisma-client-js"
  // [2025-01-29 17:30:00] 回到最简单的配置（方案 1）
  // 移除 binaryTargets，让 Prisma 自动检测平台
}
```

### 3. 简化 server.js

**文件**: `backend/server.js`

**修改**:
- ✅ 简化 `ensurePrismaClient` 函数
- ✅ 移除构建时生成检查逻辑
- ✅ 简化为纯运行时生成（使用真实的 DATABASE_URL）
- ✅ 移除不必要的环境变量设置

**关键逻辑**:
```javascript
const ensurePrismaClient = () => {
  // 验证真实的 DATABASE_URL
  validateDatabaseUrl();
  
  // 运行时生成（使用真实的 DATABASE_URL）
  const generateEnv = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL, // 真实的数据库 URL
  };
  
  execSync('npx prisma generate --schema=./prisma/schema.prisma', { 
    env: generateEnv,
  });
};
```

## 工作原理

### 为什么这样可以解决 engine=none 问题？

1. **真实的 DATABASE_URL**：
   - 运行时生成时，DATABASE_URL 来自 Secret Manager（真实的数据库连接）
   - Prisma 检测到真实的 `postgresql://` URL，不会误判为 DataProxy 模式

2. **自动平台检测**：
   - 移除 `binaryTargets` 后，Prisma 会自动检测当前运行平台（Cloud Run 的 Debian）
   - 自动下载正确的引擎文件

3. **简化的配置**：
   - 不需要额外的环境变量来禁用 DataProxy
   - 不需要指定二进制目标平台
   - 让 Prisma 按照默认行为工作

## 预期结果

1. ✅ Prisma Client 在运行时生成（使用真实的 DATABASE_URL）
2. ✅ 不再出现 `engine=none` 错误
3. ✅ 数据库连接正常
4. ✅ API 端点返回 200
5. ✅ 类目和商品数据正常加载

## 验证步骤

部署后检查：
1. 构建日志中是否不再有构建时生成 Prisma Client 的步骤
2. 运行时日志中 Prisma Client 是否成功生成（不显示 engine=none）
3. `/health` 端点返回 200（数据库连接正常）
4. `/api/categories` 和 `/api/products` 返回 200

---

**提交**: 已提交到 GitHub
**构建**: 等待构建完成
**验证**: 待部署后验证

