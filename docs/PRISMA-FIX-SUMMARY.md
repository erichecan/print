# Prisma 数据库连接 500 错误修复总结
# [2025-01-29 14:55:00]

## 问题描述

### 错误现象
- `/api/categories` API 返回 500 (Internal Server Error)
- 错误信息：`Error validating datasource 'db': the URL must start with the protocol 'prisma://'`
- Prisma Client 已成功生成，但在查询时失败

### 根本原因
1. **Prisma Client 初始化问题**：`backend/src/lib/prisma.js` 使用 Proxy 模式延迟初始化，可能导致初始化不完整
2. **环境变量读取问题**：Prisma Client 在运行时可能没有正确读取 `DATABASE_URL` 环境变量
3. **缺少验证**：没有验证 DATABASE_URL 格式是否正确

## 修复方案

### 1. 修复 Prisma Client 初始化逻辑

**文件**: `backend/src/lib/prisma.js`

**主要改动**：
- ✅ 添加 `validateDatabaseUrl()` 函数，验证 DATABASE_URL 格式
- ✅ 确保 DATABASE_URL 以 `postgresql://` 或 `postgres://` 开头
- ✅ 添加详细的诊断日志（不暴露密码）
- ✅ 改进错误处理，提供更清晰的错误信息

### 2. 修复 server.js 中的 Prisma Client 生成

**文件**: `backend/server.js`

**主要改动**：
- ✅ 添加 `validateDatabaseUrl()` 函数，在生成 Prisma Client 前验证
- ✅ 确保 DATABASE_URL 环境变量正确传递到生成过程
- ✅ 明确设置 `PRISMA_GENERATE_DATAPROXY: 'false'`
- ✅ 添加详细的诊断日志

### 3. 验证环境变量配置

**验证结果**：
- ✅ Secret Manager 中的 `database-url` secret 格式正确
- ✅ 格式为：`postgresql://...` (符合预期)

## 修复内容

### backend/src/lib/prisma.js

```javascript
// 添加 DATABASE_URL 验证函数
function validateDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    logger.error('❌ DATABASE_URL environment variable is not set');
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  // 验证 URL 格式
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    logger.error('❌ Invalid DATABASE_URL format');
    throw new Error(`Invalid DATABASE_URL format. Expected postgresql:// or postgres://`);
  }
  
  logger.info('✅ DATABASE_URL validated');
}

// 在 getPrisma() 函数中调用验证
function getPrisma() {
  if (!prisma) {
    try {
      validateDatabaseUrl(); // 验证环境变量
      // ... 创建 Prisma Client
    } catch (error) {
      logger.error('❌ Failed to create Prisma Client:', error.message);
      throw error;
    }
  }
  return prisma;
}
```

### backend/server.js

```javascript
// 添加 DATABASE_URL 验证函数
const validateDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  // 验证 URL 格式
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    console.error('❌ Invalid DATABASE_URL format');
    throw new Error(`Invalid DATABASE_URL format`);
  }
  
  console.log('✅ DATABASE_URL validated');
};

// 在 ensurePrismaClient() 中调用验证
const ensurePrismaClient = () => {
  try {
    validateDatabaseUrl(); // 验证环境变量
    // ... 生成 Prisma Client
  } catch (error) {
    console.error('❌ Failed to generate Prisma Client:', error.message);
    process.exit(1);
  }
};
```

## 部署状态

- ✅ 代码已提交到 GitHub (commit: 626017f)
- ✅ 已触发 GCP Cloud Build 部署
- ⏳ 等待部署完成并验证

## 预期效果

部署完成后，应该能够：
- ✅ Prisma Client 正确读取 DATABASE_URL 环境变量
- ✅ `/api/categories` API 正常返回数据（HTTP 200）
- ✅ `/api/products` API 正常返回数据（HTTP 200）
- ✅ 数据库连接正常，不再出现 `prisma://` 协议错误

## 验证步骤

部署完成后，请验证：
1. 检查后端服务日志，确认 DATABASE_URL 验证通过
2. 测试 `/api/categories` 端点，应该返回 200 状态码
3. 测试 `/api/products` 端点，应该返回 200 状态码
4. 检查前端网站，类目数据应该正常加载

---

**修复时间**: 2025-01-29 14:50:00  
**提交**: 626017f  
**部署**: 进行中

