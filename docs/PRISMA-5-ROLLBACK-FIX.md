# Prisma 5.22.0 回退修复总结
# [2025-01-29 17:10:00]

## 决策

选择**方案 A**：回退到 Prisma 5.22.0 并正确配置二进制引擎模式。

## 原因

1. **Prisma 7.x 不稳定**
   - 配置变化太大
   - 文档不完整
   - 遇到配置矛盾问题

2. **稳定性优先**
   - Prisma 5.22.0 稳定可靠
   - 文档完善
   - 配置简单

3. **快速解决问题**
   - 用户需要快速修复问题
   - 回退方案风险低

## 修改内容

### 1. 版本回退

**文件**: `backend/package.json`

```json
{
  "dependencies": {
    "@prisma/client": "5.22.0"
  },
  "devDependencies": {
    "prisma": "5.22.0"
  }
}
```

- 移除了 `@prisma/adapter-pg`

### 2. Schema 配置

**文件**: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
  previewFeatures = []
}
```

- 明确指定二进制目标平台
- 禁用 DataProxy

### 3. Prisma Client 初始化

**文件**: `backend/src/lib/prisma.js`

- 移除了所有适配器相关代码
- 恢复标准 PrismaClient 初始化
- 使用二进制引擎模式

### 4. Dockerfile 配置

**文件**: `backend/Dockerfile`

- 添加环境变量禁用 DataProxy
- 检查引擎文件生成
- 保持 Node.js 20（向后兼容）

## 预期结果

1. ✅ Prisma Client 生成成功（包含引擎文件）
2. ✅ 不再出现 `engine=none` 错误
3. ✅ 数据库连接正常
4. ✅ API 端点返回 200
5. ✅ CORS 错误解决

## 构建状态

- 已提交代码
- 已触发新部署
- 等待构建完成并验证

---

**修复时间**: 2025-01-29 17:10:00

