# Design Lab Logo和My Designs本地保存功能 - 任务理解文档

**创建时间**: 2025-12-19 16:00:00

## 一、任务背景与现状（已确认）

### 1.1 当前Logo实现
**位置**: `apps/web/src/app/design-lab/DesignLabClient.tsx` (Lines 3843-3845)
```tsx
<Link href="/" className="dl-header__logo">
  Logo
</Link>
```
- 现状：使用纯文字"Logo"，不是图片
- 主站Logo实现：`apps/web/src/components/SiteHeader.tsx` (Lines 128-129) 使用 `<Image src="/logo.png" alt="Souvenir Plus Inc" width={200} height={34} priority />`

### 1.2 当前My Designs实现
**位置**: `apps/web/src/app/design-lab/DesignLabClient.tsx` (Lines 3848-3854)
```tsx
<button 
  className="dl-header__breadcrumb-link dl-header__breadcrumb-link--button"
  onClick={() => window.location.href = '/products'}
  type="button"
>
  My Designs
</button>
```
- 现状：直接跳转到 `/products`
- 问题：没有本地保存逻辑，跳转会丢失当前设计状态

### 1.3 当前保存逻辑
**位置**: `apps/web/src/app/design-lab/DesignLabClient.tsx` (Lines 2541-2605)
- `handleSaveDesignConfirm` 函数调用 `designLabApi.createDraft/updateDraft` 保存到后端
- **重要发现**：`designLabStore.ts` 没有 persist 中间件，也没有 localStorage 存取
- Store 使用 Zustand + Immer，包含：
  - `viewCanvases: Record<DesignView, DesignCanvasSnapshot>` - 三面画布快照
  - `currentView: DesignView` - 当前视图（front/back/sleeve）
  - `draft?: DesignDraft` - 后端草稿数据
- 已有 `canvasToSnapshot` 函数可用于生成快照

### 1.4 /account/designs 页面状态
**位置**: `apps/web/src/app/account/designs/page.tsx`
- 现状：只是一个占位符页面，显示"Saved Design Lab projects will appear here"
- 没有实际的草稿列表展示功能
- `ACCOUNT_ROUTES.designs` 定义为 `/account/designs`

## 二、需求分析

### 2.1 Logo功能需求
1. **使用主站Logo**：将文字"Logo"改为 `/logo.png` 图片（与 `SiteHeader.tsx` 保持一致）
2. **点击返回主站**：点击Logo导航到主站（默认建议 `/`，但需确认）

### 2.2 My Designs功能需求
1. **本地保存**：点击"My Designs"前必须保存当前设计到本地（localStorage）
2. **保存内容**：
   - `designName` - 设计名称
   - `viewCanvases` - 三面画布快照（front/back/sleeve）
   - `currentView` - 当前视图
   - `productInfo` / `variantId` - 产品信息
   - `savedAt` - 保存时间戳（到秒）
   - `version` - 版本号（用于后续兼容）
3. **错误处理**：保存失败时的降级策略（需确认）

### 2.3 跳转目标确认
- 当前代码跳转到 `/products`
- `ACCOUNT_ROUTES.designs` 定义为 `/account/designs`，但页面只是占位符
- **需要确认**：跳转到 `/account/designs` 还是保留 `/products`？

## 三、待确认问题（必须等待确认后再执行）

### 问题1：Logo点击目标
- **问题**：点击Logo应该导航到哪个路径？
- **建议**：`/`（主站首页）
- **备选**：`/products`（产品列表页）
- **请确认**：`/` 还是 `/products` 或其他？

### 问题2：本地保存失败策略
- **问题**：如果 localStorage 保存失败（如存储空间已满、隐私模式等），应该如何处理？
- **选项A**：提示用户保存失败并阻止跳转，要求用户重试
- **选项B**：允许继续跳转，但明确告知用户设计会丢失
- **建议**：选项A（阻止跳转），因为设计数据很重要
- **请确认**：选项A 还是 选项B？

### 问题3：My Designs跳转目标
- **问题**：点击"My Designs"应该跳转到哪里？
- **选项A**：`/account/designs` - 账户设计页面（但当前只是占位符）
- **选项B**：`/products` - 产品列表页（当前实现）
- **选项C**：跳转到 `/account/designs`，但需要最小可用方案（显示本地草稿）
- **建议**：选项C（跳转到 `/account/designs` 并显示本地草稿）
- **请确认**：选择哪个选项？如果选C，是否需要我实现 `/account/designs` 的草稿展示功能？

### 问题4：本地存储方案
- **问题**：使用 localStorage 还是 IndexedDB？
- **现状**：设计快照可能较大（包含三面画布的 objects 数组）
- **建议**：
  - 优先 localStorage（简单、同步、易于调试）
  - 如果数据过大（>5MB），考虑 IndexedDB
  - 先实现 localStorage，如果测试中发现存储限制，再迁移到 IndexedDB
- **请确认**：先试 localStorage，遇到问题再迁移，是否可以？

### 问题5：/account/designs 页面功能
- **问题**：如果跳转到 `/account/designs`，是否需要展示本地草稿？
- **最小方案**：仅显示1条"未保存草稿"卡片，点击可跳回 `/design-lab` 恢复
- **完整方案**：完整的草稿列表、删除、恢复等功能
- **建议**：先实现最小方案（显示本地草稿并支持恢复）
- **请确认**：最小方案是否可以？还是需要完整功能？

## 四、技术实现方案（待确认后细化）

### 4.1 Logo替换
- 使用 Next.js `Image` 组件加载 `/logo.png`
- 保持与 `SiteHeader.tsx` 相同的尺寸和样式
- 添加适当的 alt 文本和 aria-label

### 4.2 本地保存函数
- 创建 `saveDesignToLocalStorage` 函数
- 使用 key: `designLab:lastDraft` 或 `designLab:drafts:{timestamp}`
- 包含 try/catch 错误处理
- 序列化 store 状态（viewCanvases、currentView、designName、productInfo）

### 4.3 My Designs点击处理
- 修改 onClick 处理函数
- 先调用本地保存
- 保存成功后再跳转
- 根据问题2的确认结果处理失败情况

### 4.4 /account/designs 页面增强（如果选选项C）
- 读取 localStorage 中的草稿
- 显示草稿卡片
- 实现恢复功能（跳转回 `/design-lab` 并恢复状态）

## 五、测试计划

### 5.1 Chrome DevTools验证
1. 验证Logo显示为图片（不是文字）
2. 验证点击Logo跳转到目标路径
3. 验证点击My Designs后，Application → Local Storage 中有草稿数据
4. 验证草稿数据结构完整性

### 5.2 Playwright E2E测试
1. Logo显示测试：验证Logo是图片元素且有正确的alt/label
2. Logo点击测试：验证点击Logo跳转到主站
3. My Designs保存测试：验证点击前写入localStorage
4. My Designs跳转测试：验证跳转到目标页面
5. 草稿恢复测试（如果实现）：验证从/account/designs恢复草稿

## 六、To-Do List（待确认后执行）

### 高优先级（必须实现）
1. [ ] 替换Logo为图片（30分钟）
2. [ ] 实现本地保存函数 `saveDesignToLocalStorage`（1小时）
3. [ ] 修改My Designs点击处理，集成本地保存（30分钟）
4. [ ] 实现错误处理和降级策略（30分钟）

### 中优先级（根据确认结果）
5. [ ] 实现/account/designs草稿展示（如选选项C，2小时）
6. [ ] 实现草稿恢复功能（如选选项C，1.5小时）

### 测试优先级
7. [ ] Chrome DevTools手动验证（30分钟）
8. [ ] 编写Playwright测试用例（1.5小时）
9. [ ] 运行测试并修复问题（1小时）

### 文档和交付
10. [ ] 编写根因说明文档（30分钟）
11. [ ] 整理改动文件列表和diff摘要（30分钟）
12. [ ] 提交代码并部署（30分钟）

**预计总时间**：8-11小时（取决于选项C的实现范围）

---

## 七、等待确认

**请在确认以下问题后，我再开始执行代码改动：**

1. ✅ Logo点击目标：`/` 还是 `/products`？
2. ✅ 本地保存失败策略：选项A（阻止跳转）还是选项B（允许跳转但提示）？
3. ✅ My Designs跳转目标：选项A（/products）、选项B（/products）、还是选项C（/account/designs + 草稿展示）？
4. ✅ 本地存储方案：先试localStorage，遇到问题再迁移，是否可以？
5. ✅ /account/designs页面功能：最小方案（显示草稿+恢复）是否可以？

**请回复确认上述问题，我将立即开始执行。**
