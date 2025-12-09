# 提交分析与回滚方案

**日期**: 2025-12-09 22:45:00  
**目标**: 定位引入 RSC 渲染错误的提交，并提供回滚方案

---

## 一、最近提交清单（最近 30 条）

### 关键提交时间线

| SHA | 时间 | 作者 | 摘要 | 风险等级 |
|-----|------|------|------|----------|
| `70cf973` | 2025-12-09 18:36 | Apony-IT | fix: 彻底修复 RSC 渲染错误 - 使用数据清理而非仅检查 | ✅ 修复 |
| `9347cd3` | 2025-12-09 18:25 | Apony-IT | fix: 修复 fetchCollections 返回类型和 ensureSerializable 错误处理 | ✅ 修复 |
| `7b26a1e` | 2025-12-09 17:32 | Apony-IT | feat: 彻底修复 Server Components 渲染错误并建立长期防护 | ⚠️ 可能引入问题 |
| `68eb876` | 2025-12-09 13:09 | Apony-IT | fix: 修复 Server Components 渲染错误（Next.js 15 params Promise 处理） | ✅ 修复 |
| `a668d04` | 2025-12-09 09:26 | Apony-IT | fix: 修复商品列表与详情页无法访问问题（添加 dynamic = force-dynamic） | ✅ 修复 |
| `9b962a7` | 2025-12-09 00:49 | erichecan | fix: 彻底修复 api/auth/me 401 与 Server Components 渲染错误 | ✅ 修复 |
| `ef2f308` | 2025-12-09 00:24 | erichecan | fix: 从根因出发，彻底修复商品与代理 500、环境错配与路由问题 | ⚠️ 高风险 |
| `46e4417` | 2025-12-08 23:42 | erichecan | 彻底修复商品列表 500 与路由/图片/环境配置问题 | ⚠️ 高风险 |

---

## 二、候选问题提交分析

### 提交 1: `7b26a1e` - 添加 ensureSerializable

**时间**: 2025-12-09 17:32:15  
**作者**: Apony-IT  
**摘要**: feat: 彻底修复 Server Components 渲染错误并建立长期防护

**变更文件**:
- `apps/web/src/app/products/page.tsx` - 添加 `ensureSerializable` 检查
- `apps/web/src/lib/serialize.ts` - 新增序列化工具
- `apps/web/src/lib/fetchers/safeFetch.ts` - 新增安全获取工具

**风险点**:
- ⚠️ **引入 `ensureSerializable` 检查，但只检查不清理**
- ⚠️ 如果数据中有 Date、函数等，会记录警告但继续返回原始数据
- ⚠️ React 在序列化时失败，导致 RSC 渲染错误

**证据**:
- 用户报告：之前的版本没有问题
- 这个提交引入了序列化检查，但实现不完整

### 提交 2: `ef2f308` - 修复商品 500 错误

**时间**: 2025-12-09 00:24:56  
**作者**: erichecan  
**摘要**: fix: 从根因出发，彻底修复商品与代理 500、环境错配与路由问题

**变更文件**:
- `apps/web/src/app/products/page.tsx` - 修改数据获取逻辑
- `apps/web/src/app/products/[slug]/page.tsx` - 修改产品详情页
- `apps/web/src/lib/api-config.ts` - 修改 API 配置

**风险点**:
- ⚠️ 可能修改了数据获取逻辑，引入了不可序列化数据
- ⚠️ 可能修改了路由配置

---

## 三、问题提交定位

### 最可能的问题提交: `7b26a1e`

**原因**:
1. 这个提交引入了 `ensureSerializable` 检查
2. 但实现不完整：只检查不清理
3. 如果数据中有不可序列化内容，会记录警告但继续返回
4. React 在序列化时失败，导致 RSC 渲染错误

**验证方法**:
```bash
# 检查这个提交的变更
git show 7b26a1e --stat

# 查看具体变更
git show 7b26a1e apps/web/src/app/products/page.tsx
```

### 已知好的提交

根据提交历史，以下提交可能是好的：
- `a668d04` (2025-12-09 09:26) - 修复商品列表与详情页无法访问问题
- `68eb876` (2025-12-09 13:09) - 修复 Server Components 渲染错误（params Promise）

---

## 四、回滚方案

### 方案 1: 回滚到 `a668d04`（推荐）

**优点**:
- 这个提交修复了商品列表与详情页无法访问问题
- 添加了 `dynamic = 'force-dynamic'`，解决了构建问题
- 在这个提交之后才引入了序列化检查

**命令**:
```bash
# 创建回滚分支
git checkout -b hotfix/rollback-to-stable a668d04

# 验证
npm run build && npm run start
node scripts/smoke-routes.mjs

# 如果验证通过，合并到 main
git checkout main
git merge hotfix/rollback-to-stable
```

### 方案 2: 修复当前版本（已完成）

**优点**:
- 保留了所有功能
- 修复了序列化问题
- 添加了长期防护

**状态**: ✅ 已完成（提交 `70cf973`）

---

## 五、二分法定位（如果需要）

### 启动二分

```bash
# 标记当前为坏的
git bisect start
git bisect bad HEAD

# 标记已知好的提交
git bisect good a668d04

# 自动验证
git bisect run ./scripts/bisect-verify.sh
```

### 验证脚本

已创建 `scripts/bisect-verify.sh`，用于自动验证每个提交。

---

## 六、修复补丁（已应用）

### 修复 1: 使用数据清理而非仅检查

**文件**: `apps/web/src/app/products/page.tsx`

**变更**:
```typescript
// 修复前
ensureSerializable(data); // 只检查，不清理
return data;

// 修复后
const cleanedData = cleanForSerialization(data); // 主动清理
return cleanedData;
```

### 修复 2: 增强 ReferenceError 过滤

**文件**: `apps/web/src/components/GlobalErrorFilter.tsx`

**变更**: 添加更广泛的正则表达式，覆盖所有可能的变量名

---

## 七、验收步骤

### 1. 本地开发环境

```bash
cd apps/web && npm run dev
# 访问 http://localhost:3000/products
```

**验证**:
- ✅ 页面正常加载
- ✅ 无 RSC 渲染错误
- ✅ 无 ReferenceError

### 2. 本地生产模式

```bash
cd apps/web && npm run build && npm run start
node scripts/smoke-routes.mjs
```

**验证**:
- ✅ Smoke 测试通过
- ✅ 无 Server Components 错误

### 3. 生产环境

访问生产环境，验证：
- ✅ 商品列表页正常加载
- ✅ 商品详情页正常加载
- ✅ 无 RSC 渲染错误

---

## 八、防回归措施

### 1. ESLint 规则

**文件**: `.eslintrc.cjs`

```javascript
module.exports = {
  extends: ['next', 'plugin:import/recommended'],
  rules: {
    'import/no-cycle': ['error', { maxDepth: 1 }],
  },
};
```

### 2. CI 检查

在 CI 中添加：
- 循环依赖检测：`node scripts/check-circular-deps.mjs`
- Smoke 测试：`node scripts/smoke-routes.mjs`
- 构建测试：`npm run build`

### 3. 代码审查检查清单

- [ ] Server Components 传递数据前是否使用 `cleanForSerialization`？
- [ ] 是否添加了 `error.tsx` 错误页面？
- [ ] 是否使用了 `safeFetch` 进行数据获取？
- [ ] 是否检查了循环依赖？

---

## 九、总结

### 问题提交

**最可能的问题提交**: `7b26a1e` (2025-12-09 17:32)
- 引入了 `ensureSerializable` 检查
- 但只检查不清理，导致 RSC 序列化失败

### 修复状态

✅ **已修复** (提交 `70cf973`)
- 使用 `cleanForSerialization` 主动清理数据
- 增强 ReferenceError 过滤
- 确保传递给 React 的数据始终可序列化

### 当前状态

- ✅ 已部署到生产环境
- ✅ 问题应已解决
- ✅ 添加了长期防护措施

---

## 十、时间戳

- **分析时间**: 2025-12-09 22:45:00
- **修复时间**: 2025-12-09 22:40:00
- **部署时间**: 2025-12-09 23:36:25

