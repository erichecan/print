# 可回滚版本列表（21小时前及更早）

**分析时间**: 2025-12-09  
**当前问题**: 商品列表和详情页无法访问，`949f971` 回滚后问题仍然存在

---

## 一、关键提交分析

### 可能影响商品页面的提交

| 提交 | 时间 | 说明 | 影响文件 | 风险 |
|------|------|------|----------|------|
| `f12ad46` | 2025-12-08 09:33:54 | 重构商品详情页的 Add to Cart 与 Buy Now 功能 | `apps/web/src/app/products/[slug]/ProductDetailContent.tsx` | ⚠️ **高风险** |
| `b034298` | 2025-12-08 01:05:31 | 修复 API 代理路由 404 问题：移除冲突的 rewrite 规则 | `apps/web/next.config.mjs` | ⚠️ **高风险** |
| `3c375d6` | 2025-12-08 00:57:35 | 修复 API 代理路由：兼容 Next.js 14 和 15 的参数类型 | `apps/web/src/app/api/proxy/[...path]/route.ts` | ⚠️ **高风险** |
| `c9f4240` | 2025-12-08 01:18:41 | 修复 Next.js 14 catch-all 路由参数类型 | `apps/web/src/app/api/proxy/[...path]/route.ts` | ⚠️ 中风险 |

---

## 二、推荐回滚版本

### 方案 1: 回滚到 `f12ad46` 之前（推荐）

**父提交**: `f76ad76` 或更早  
**时间**: 约 34 小时前（2025-12-08 09:37:21 之前）  
**原因**: `f12ad46` 重构了商品详情页，可能是问题源头

**回滚命令**:
```bash
# 查看 f12ad46 的父提交
git log --oneline f12ad46~1 -1

# 回滚商品详情页
git checkout f12ad46~1 -- apps/web/src/app/products/[slug]/ProductDetailContent.tsx
git checkout f12ad46~1 -- apps/web/src/app/products/[slug]/page.tsx

# 提交回滚
git commit -m "fix: 回滚商品详情页到 f12ad46 之前版本"
```

### 方案 2: 回滚到 `b034298` 之前

**父提交**: `6c0623a` 或更早  
**时间**: 约 2 天前（2025-12-08 01:04:56 之前）  
**原因**: `b034298` 修复了 API 代理路由，可能影响商品页面的 API 请求

**回滚命令**:
```bash
# 查看 b034298 的父提交
git log --oneline b034298~1 -1

# 回滚 API 路由和配置
git checkout b034298~1 -- apps/web/next.config.mjs
git checkout b034298~1 -- apps/web/src/app/api/proxy/[...path]/route.ts

# 提交回滚
git commit -m "fix: 回滚 API 代理路由到 b034298 之前版本"
```

### 方案 3: 回滚到 `3c375d6` 之前

**父提交**: `1ce522c` 或更早  
**时间**: 约 2 天前（2025-12-08 01:03:27 之前）  
**原因**: `3c375d6` 修复了 API 代理路由参数类型，可能影响商品页面

**回滚命令**:
```bash
# 查看 3c375d6 的父提交
git log --oneline 3c375d6~1 -1

# 回滚 API 代理路由
git checkout 3c375d6~1 -- apps/web/src/app/api/proxy/[...path]/route.ts

# 提交回滚
git commit -m "fix: 回滚 API 代理路由到 3c375d6 之前版本"
```

---

## 三、完整回滚方案（推荐）

### 回滚所有可能影响的文件

```bash
# 1. 回滚商品详情页（f12ad46 之前）
git checkout f12ad46~1 -- apps/web/src/app/products/[slug]/ProductDetailContent.tsx
git checkout f12ad46~1 -- apps/web/src/app/products/[slug]/page.tsx

# 2. 回滚 API 代理路由（b034298 之前）
git checkout b034298~1 -- apps/web/next.config.mjs
git checkout b034298~1 -- apps/web/src/app/api/proxy/[...path]/route.ts

# 3. 检查变更
git diff --staged

# 4. 提交回滚
git commit -m "fix: 回滚商品页面和 API 路由到稳定版本（f12ad46 和 b034298 之前）"
```

---

## 四、版本时间线

### 34小时前（2025-12-08 09:33:54）
- **`f12ad46`** - 重构商品详情页的 Add to Cart 与 Buy Now 功能 ⚠️

### 2天前（2025-12-08 01:05:31）
- **`b034298`** - 修复 API 代理路由 404 问题 ⚠️

### 2天前（2025-12-08 00:57:35）
- **`3c375d6`** - 修复 API 代理路由参数类型 ⚠️

### 2天前（2025-12-08 01:18:41）
- **`c9f4240`** - 修复 Next.js 14 catch-all 路由参数类型 ⚠️

---

## 五、验证步骤

### 回滚后验证

```bash
# 1. 启动开发服务器
cd apps/web
pnpm dev

# 2. 访问商品列表页
# http://localhost:3000/products

# 3. 访问商品详情页
# http://localhost:3000/products/[任意商品slug]

# 4. 检查控制台和网络请求
# 5. 如果正常，部署到 GCP
bash scripts/deploy-gcp.sh
```

---

## 六、建议

### 推荐顺序
1. ✅ **先尝试方案 1**（回滚商品详情页到 `f12ad46` 之前）
2. ✅ **如果不行，尝试方案 2**（回滚 API 路由到 `b034298` 之前）
3. ✅ **如果还不行，尝试完整回滚方案**（回滚所有可能影响的文件）

### 注意事项
- 回滚会丢失一些新功能（如商品详情页的购物车改进、API 路由修复等）
- 建议先备份当前代码
- 回滚后需要测试所有功能

---

**分析完成时间**: 2025-12-09  
**建议**: ✅ **先尝试回滚商品详情页到 `f12ad46` 之前**

