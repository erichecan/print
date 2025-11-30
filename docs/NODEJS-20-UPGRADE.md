# Node.js 20 升级修复
# [2025-01-29 16:55:00]

## 问题

构建失败，错误信息：
```
Prisma only supports Node.js versions 20.19+, 22.12+, 24.0+.
Please upgrade your Node.js version.
```

## 根本原因

Prisma 7.x 对 Node.js 版本有要求：
- Node.js 20.19+ 
- Node.js 22.12+
- Node.js 24.0+

但 Dockerfile 中使用的是 Node.js 18，不满足要求。

## 解决方案

升级 Dockerfile 中的 Node.js 版本：

**文件**: `backend/Dockerfile`

```dockerfile
## [2025-01-29 16:55:00] 升级到 Node.js 20（Prisma 7.x 要求）
FROM node:20-bullseye-slim AS base
```

## 修改详情

- 从: `node:18-bullseye-slim`
- 到: `node:20-bullseye-slim`

## 预期结果

1. ✅ 构建成功（Node.js 版本满足要求）
2. ✅ Prisma 7.x 安装成功
3. ✅ Prisma Client 生成成功
4. ✅ 服务正常运行

---

**修复时间**: 2025-01-29 16:55:00

