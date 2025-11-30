# Prisma 7.x Schema URL 移除修复
# [2025-01-29 17:00:00]

## 问题

构建失败，错误信息：
```
The datasource property `url` is no longer supported in schema files.
Move connection URLs for Migrate to `prisma.config.ts` and pass either 
`adapter` for a direct database connection or `accelerateUrl` for Accelerate 
to the PrismaClient constructor.
```

## 根本原因

Prisma 7.x 有重大变化：
- **不再支持在 `schema.prisma` 中使用 `url` 属性**
- 连接 URL 需要：
  1. 移到 `prisma.config.ts`（用于 Migrate）
  2. 或在 `PrismaClient` 构造函数中通过适配器传递

## 解决方案

### 1. 从 schema.prisma 移除 url

**文件**: `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  // Prisma 7.x: url 已移除，连接 URL 通过适配器传递
}
```

### 2. 连接 URL 通过适配器传递

连接 URL 已经在 `backend/src/lib/prisma.js` 中通过适配器传递：

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

## 修改详情

- **移除**: `url = env("DATABASE_URL")` 从 `schema.prisma`
- **保留**: 适配器配置在 `backend/src/lib/prisma.js`

## 预期结果

1. ✅ Schema 验证通过
2. ✅ Prisma Client 生成成功
3. ✅ 数据库连接正常（通过适配器）
4. ✅ API 端点正常工作

---

**修复时间**: 2025-01-29 17:00:00

