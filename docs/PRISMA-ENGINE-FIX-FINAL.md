# Prisma engine=none 错误最终修复
# [2025-01-29 15:50:00]

## 问题根本原因

### 发现
从构建日志中发现，**即使在构建时生成 Prisma Client，也是 `engine=none`**：

```
✔ Generated Prisma Client (v5.22.0, engine=none) to ./node_modules/@prisma/client in 493ms
⚠️  Warning: Engine file not found in expected location
```

这说明问题不在于运行时 vs 构建时，而是 **Prisma 本身没有生成引擎文件**。

### 根本原因
- Prisma 在生成 Client 时没有包含查询引擎二进制文件
- 可能是因为没有明确指定 `binaryTargets`
- 或者 Prisma 检测到某些环境条件，决定使用 DataProxy 模式

## 解决方案

### 1. 添加 binaryTargets 到 Prisma Schema

**文件**: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  // 明确指定二进制目标平台，确保生成引擎文件
  binaryTargets = ["native", "debian-openssl-3.0.x"]
  previewFeatures = []
}
```

### 2. 在 Dockerfile 中构建时生成

**文件**: `backend/Dockerfile`

- 在构建时预生成 Prisma Client（包含引擎）
- 使用占位符 DATABASE_URL
- 明确禁用 DataProxy

### 3. server.js 检查是否已生成

**文件**: `backend/server.js`

- 检查 Prisma Client 是否已在构建时生成
- 如果已生成且有引擎文件，跳过运行时生成

## 提交记录

1. **f638a2a** - 在构建时预生成 Prisma Client
2. **b3a5e31** - 添加 binaryTargets 确保生成引擎文件

## 部署状态

- ✅ 代码已提交到 GitHub
- ✅ 已触发新部署（包含 binaryTargets 修复）
- 构建 ID: 32b72b70-16bc-45d8-8495-0727666c6b74
- 状态: 进行中

## 预期效果

部署完成后，应该能够：

1. **构建时生成包含引擎的 Prisma Client**
   - 不再显示 `engine=none`
   - 引擎文件（`.node`）存在于 `node_modules/.prisma/client/`

2. **运行时检测到已生成的 Client**
   - 跳过运行时生成
   - 直接使用构建时生成的 Client

3. **API 正常工作**
   - `/api/categories` 返回 200
   - `/api/products` 返回 200
   - 不再出现 `prisma://` 协议错误

---

**修复时间**: 2025-01-29 15:50:00

