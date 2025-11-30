# Prisma 6.x 无 Rust 引擎模式升级指南
# [2025-01-29 16:30:00]

## 升级内容

### 1. Prisma 版本升级

**文件**: `backend/package.json`

- `@prisma/client`: `5.22.0` → `^6.21.0`
- `prisma`: `5.22.0` → `^6.21.0`
- 新增: `@prisma/adapter-pg`: `^6.21.0`

### 2. Schema 配置修改

**文件**: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  // 使用无 Rust 引擎模式
  engineType = "client"
}
```

- ✅ 移除了 `binaryTargets`（不再需要）
- ✅ 移除了 `previewFeatures`（不再需要）
- ✅ 添加了 `engineType = "client"`

### 3. Prisma Client 初始化修改

**文件**: `backend/src/lib/prisma.js`

**关键变化**：
- ✅ 导入 `@prisma/adapter-pg` 和 `pg` 的 `Pool`
- ✅ 创建 PostgreSQL 连接池
- ✅ 创建 Prisma 适配器实例
- ✅ 使用适配器初始化 Prisma Client

**代码示例**：
```javascript
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// 创建连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// 创建适配器
const adapter = new PrismaPg(pool);

// 使用适配器初始化 Prisma Client
const prisma = new PrismaClient({ adapter });
```

### 4. Dockerfile 简化

**文件**: `backend/Dockerfile`

- ✅ 移除了所有引擎相关的环境变量
- ✅ 简化了 Prisma Client 生成步骤
- ✅ 不再需要检查引擎文件

### 5. Server.js 简化（如果需要）

- ✅ 不再需要复杂的引擎检查逻辑
- ✅ Prisma Client 生成更简单快速

## 优势

1. **不需要 Rust 引擎**
   - ✅ 避免了 `engine=none` 问题
   - ✅ 不需要下载大型引擎二进制文件
   - ✅ 更小的 Docker 镜像

2. **更快的生成**
   - ✅ Prisma Client 生成更快
   - ✅ 不需要等待引擎下载

3. **更好的兼容性**
   - ✅ 不依赖平台特定的二进制文件
   - ✅ 在所有平台上工作一致

4. **官方推荐**
   - ✅ Prisma 6.x 的官方推荐方式
   - ✅ 更好的边缘环境支持

## 注意事项

1. **连接池管理**
   - 需要手动管理 PostgreSQL 连接池
   - 确保连接池正确关闭

2. **性能**
   - 无 Rust 引擎模式可能有轻微的性能差异
   - 但对于大多数应用来说，差异可以忽略

3. **迁移**
   - 现有的 Prisma 查询代码不需要修改
   - 只是初始化方式改变了

## 测试

升级后，需要测试：
- ✅ Prisma Client 生成成功（没有 engine=none）
- ✅ 数据库连接正常
- ✅ 查询操作正常
- ✅ API 端点返回 200

---

**升级时间**: 2025-01-29 16:30:00

