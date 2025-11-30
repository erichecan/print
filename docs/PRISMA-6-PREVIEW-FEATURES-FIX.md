# Prisma 6.x Preview Features 修复
# [2025-01-29 16:40:00]

## 问题

升级到 Prisma 6.x 后，仍然出现错误：
```
Error validating datasource `db`: the URL must start with the protocol `prisma://`
```

## 根本原因

Prisma 6.x 的无 Rust 引擎模式需要启用特定的 preview features：
- `queryCompiler` - 启用查询编译器
- `driverAdapters` - 启用驱动适配器支持

## 修复

### Schema 配置修改

**文件**: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  // 启用必需的 preview features
  previewFeatures = ["queryCompiler", "driverAdapters"]
  engineType = "client"
}
```

## 参考文档

根据 Prisma 官方文档，Prisma 6.x 的无 Rust 引擎模式需要：
1. 升级到 Prisma 6.x
2. 启用 `queryCompiler` 和 `driverAdapters` preview features
3. 安装数据库驱动（`pg` 已安装）
4. 使用适配器初始化 Prisma Client（已配置）

---

**修复时间**: 2025-01-29 16:40:00

