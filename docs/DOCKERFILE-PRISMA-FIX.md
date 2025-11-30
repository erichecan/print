# Dockerfile Prisma Client 构建时生成修复
# [2025-01-29 15:25:00]

## 问题

在运行时生成 Prisma Client 导致 `engine=none` 错误：
- 运行时生成时，有时会显示 `Generated Prisma Client (v5.22.0, engine=none)`
- 这导致 Prisma Client 期望使用 DataProxy（需要 `prisma://` 协议）
- 但实际使用的是标准的 PostgreSQL URL (`postgresql://...`)

## 解决方案

### 修改 Dockerfile

在**构建时**预生成 Prisma Client（包含引擎），而不是在运行时生成。

**关键改动**：

1. **使用占位符 DATABASE_URL**：
   - Prisma Client 生成时只需要 schema 文件，不需要真实的数据库连接
   - 使用格式正确的占位符：`postgresql://placeholder:placeholder@localhost:5432/placeholder`
   - 运行时将从 Secret Manager 读取真实的 DATABASE_URL

2. **构建时生成**：
   ```dockerfile
   ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
   RUN npx prisma generate --schema=./prisma/schema.prisma
   ```

3. **验证引擎文件**：
   - 检查引擎文件（`.node`）是否生成成功
   - 如果失败，会有警告日志

4. **清除占位符**：
   - 构建后清除占位符 DATABASE_URL
   - 运行时将从 Secret Manager 读取真实值

### 修改 server.js

修改 `ensurePrismaClient()` 函数：
- **优先检查** Prisma Client 是否已在构建时生成
- 如果已生成且有引擎文件，**跳过**生成步骤
- 如果没有，才在运行时生成（作为后备方案）

## 优势

1. **更快的启动时间**：不需要在每次容器启动时生成 Prisma Client
2. **更稳定**：构建时生成有更好的网络环境和权限
3. **包含引擎**：确保引擎文件正确生成和包含
4. **后备支持**：如果构建时生成失败，仍可在运行时生成

## 文件变更

- `backend/Dockerfile` - 在构建时生成 Prisma Client
- `backend/server.js` - 检查是否已生成，避免重复生成

---

**修复时间**: 2025-01-29 15:25:00

