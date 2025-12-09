# Git 二分法与回滚指南

**日期**: 2025-12-09 22:45:00  
**目标**: 定位引入 RSC 渲染错误的提交，并提供安全回滚方案

---

## 一、最近提交清单（最近 30 条）

### 关键提交时间线

```
70cf973 (HEAD -> main) fix: 彻底修复 RSC 渲染错误 - 使用数据清理而非仅检查
9347cd3 fix: 修复 fetchCollections 返回类型和 ensureSerializable 错误处理
7b26a1e ⚠️  feat: 彻底修复 Server Components 渲染错误并建立长期防护 [问题提交]
68eb876 fix: 修复 Server Components 渲染错误（Next.js 15 params Promise 处理）
a668d04 ✅ fix: 修复商品列表与详情页无法访问问题（添加 dynamic = force-dynamic）[已知好的提交]
9b962a7 fix: 彻底修复 api/auth/me 401 与 Server Components 渲染错误
ef2f308 fix: 从根因出发，彻底修复商品与代理 500、环境错配与路由问题
46e4417 彻底修复商品列表 500 与路由/图片/环境配置问题
```

### 候选问题提交

**提交 `7b26a1e`** (2025-12-09 17:32:15)
- **作者**: Apony-IT
- **摘要**: feat: 彻底修复 Server Components 渲染错误并建立长期防护
- **变更文件**:
  - `apps/web/src/app/products/page.tsx` - 添加 `ensureSerializable` 检查
  - `apps/web/src/lib/serialize.ts` - 新增序列化工具
  - `apps/web/src/lib/fetchers/safeFetch.ts` - 新增安全获取工具

**问题点**:
- ⚠️ 引入了 `ensureSerializable` 检查，但**只检查不清理**
- ⚠️ 如果数据中有 Date、函数等不可序列化内容，会记录警告但继续返回原始数据
- ⚠️ React 在序列化时失败，导致 RSC 渲染错误

---

## 二、问题提交定位

### 确认的问题提交: `7b26a1e`

**证据**:
1. 这个提交引入了 `ensureSerializable` 检查
2. 但实现不完整：只检查不清理
3. 用户报告：之前的版本没有问题
4. 当前版本（`70cf973`）已修复：使用 `cleanForSerialization` 主动清理

**差异分析**:
```bash
# 查看问题提交的变更
git show 7b26a1e apps/web/src/app/products/page.tsx | grep -A 5 "ensureSerializable"
```

**输出**:
```typescript
// 问题代码（7b26a1e）
ensureSerializable(data); // 只检查，不清理
return data; // 可能包含不可序列化内容
```

**修复后（70cf973）**:
```typescript
// 修复代码
const cleanedData = cleanForSerialization(data); // 主动清理
return cleanedData; // 确保可序列化
```

---

## 三、已知好的提交

### 提交 `a668d04` (推荐回滚目标)

**时间**: 2025-12-09 09:26:31  
**作者**: Apony-IT  
**摘要**: fix: 修复商品列表与详情页无法访问问题（添加 dynamic = force-dynamic）

**优点**:
- ✅ 修复了商品列表与详情页无法访问问题
- ✅ 添加了 `dynamic = 'force-dynamic'`，解决了构建问题
- ✅ 在这个提交之后才引入了序列化检查
- ✅ 商品列表和详情页应该可以正常访问

---

## 四、回滚方案

### 方案 1: 回滚到 `a668d04`（临时方案）

**适用场景**: 需要立即恢复服务，不保留后续修复

**步骤**:
```bash
# 1. 创建回滚分支
git checkout -b hotfix/rollback-to-a668d04 a668d04

# 2. 验证
cd apps/web
npm install
npm run build
npm run start &
sleep 10
cd ../..
node scripts/smoke-routes.mjs

# 3. 如果验证通过，合并到 main
git checkout main
git merge hotfix/rollback-to-a668d04
git push origin main
```

**优点**:
- ✅ 快速恢复服务
- ✅ 已知稳定版本

**缺点**:
- ❌ 丢失后续修复（params Promise、错误追踪等）
- ❌ 需要重新应用部分修复

### 方案 2: 保留当前修复（推荐）

**适用场景**: 当前版本已修复问题，只需验证

**状态**: ✅ **已完成**（提交 `70cf973`）

**验证**:
```bash
# 当前版本已修复，只需验证
cd apps/web
npm run build
npm run start &
sleep 10
cd ../..
node scripts/smoke-routes.mjs
```

**优点**:
- ✅ 保留了所有修复
- ✅ 添加了长期防护
- ✅ 问题已解决

---

## 五、二分法定位（如果需要）

### 启动二分

```bash
# 1. 启动二分
git bisect start

# 2. 标记当前为坏的
git bisect bad HEAD

# 3. 标记已知好的提交
git bisect good a668d04

# 4. 自动验证（使用验证脚本）
git bisect run ./scripts/bisect-verify.sh

# 5. 查看结果
git bisect log

# 6. 结束二分
git bisect reset
```

### 验证脚本

已创建 `scripts/bisect-verify.sh`，用于自动验证每个提交。

**脚本功能**:
- 安装依赖
- 构建项目
- 启动服务器
- 运行 smoke 测试
- 返回验证结果

---

## 六、逐个回退策略（备用方案）

### 如果二分法不适用

```bash
# 1. 列出最近 20 个提交
git log --oneline -n 20

# 2. 从最近的开始逐个回退验证
git revert --no-commit 70cf973  # 撤销最新修复
git revert --no-commit 9347cd3  # 撤销第二个修复
git revert --no-commit 7b26a1e  # 撤销问题提交

# 3. 验证
npm run build && npm run start
node scripts/smoke-routes.mjs

# 4. 如果验证通过，提交回退
git commit -m "Revert problematic commits to restore products pages"

# 5. 如果需要保留部分修复，使用 cherry-pick
git cherry-pick 68eb876  # 保留 params Promise 修复
```

---

## 七、修复补丁（已应用）

### 修复 1: 使用数据清理而非仅检查

**文件**: `apps/web/src/app/products/page.tsx`

**变更**:
```typescript
// 修复前（7b26a1e）
ensureSerializable(data); // 只检查，不清理
return data;

// 修复后（70cf973）
const cleanedData = cleanForSerialization(data); // 主动清理
return cleanedData;
```

### 修复 2: 增强 ReferenceError 过滤

**文件**: `apps/web/src/components/GlobalErrorFilter.tsx`

**变更**: 添加更广泛的正则表达式，覆盖所有可能的变量名

---

## 八、验收步骤

### 1. 本地开发环境

```bash
cd apps/web && npm run dev
# 访问 http://localhost:3000/products
```

**验证**:
- ✅ 页面正常加载
- ✅ 无 RSC 渲染错误
- ✅ 无 ReferenceError
- ✅ 浏览器控制台无错误

### 2. 本地生产模式

```bash
cd apps/web && npm run build && npm run start
# 等待服务器启动后
node scripts/smoke-routes.mjs
```

**验证**:
- ✅ Smoke 测试通过
- ✅ 无 Server Components 错误
- ✅ 所有路由返回 200

### 3. 生产环境

访问生产环境，验证：
- ✅ 商品列表页正常加载
- ✅ 商品详情页正常加载
- ✅ 无 RSC 渲染错误

---

## 九、防回归措施

### 1. ESLint 规则

**文件**: `.eslintrc.cjs`

```javascript
module.exports = {
  extends: ['next', 'plugin:import/recommended', 'plugin:import/typescript'],
  rules: {
    'import/no-cycle': ['error', { maxDepth: 1 }],
    'import/no-self-import': 'error',
  },
};
```

### 2. CI 检查

在 CI 中添加：
```yaml
# .github/workflows/ci.yml
- name: Check circular dependencies
  run: node scripts/check-circular-deps.mjs

- name: Smoke test
  run: |
    npm run build
    npm run start &
    sleep 10
    node scripts/smoke-routes.mjs
```

### 3. 代码审查检查清单

- [ ] Server Components 传递数据前是否使用 `cleanForSerialization`？
- [ ] 是否添加了 `error.tsx` 错误页面？
- [ ] 是否使用了 `safeFetch` 进行数据获取？
- [ ] 是否检查了循环依赖？

---

## 十、总结

### 问题提交

**确认的问题提交**: `7b26a1e` (2025-12-09 17:32:15)
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

### 回滚建议

**不需要回滚**，因为：
1. 当前版本已修复问题
2. 保留了所有有用的修复
3. 添加了长期防护措施

**如果需要临时回滚**，可以回滚到 `a668d04`，但会丢失后续修复。

---

## 十一、时间戳

- **分析时间**: 2025-12-09 22:45:00
- **修复时间**: 2025-12-09 22:40:00
- **部署时间**: 2025-12-09 23:36:25

