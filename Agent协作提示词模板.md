# Agent 协作提示词模板

**创建时间**: 2025-01-23  
**用途**: 指导 Cursor AI Agent 如何像素级复刻 CustomInk 首页

---

## 使用说明

这些提示词可以按照以下方式使用：

1. **单 Agent 模式**: 直接复制整个"完整工作流提示词"给 Cursor
2. **多 Agent 协作**: 分别将"阶段提示词"给不同的 Agent
3. **增量迭代**: 每次只发送当前阶段的提示词

---

## 方案一：完整工作流提示词（推荐）

**适合场景**: 单 Agent 一次性完成所有任务

```
任务：像素级复刻 https://www.customink.com/ 首页

项目信息：
- 技术栈：纯 HTML/CSS/JavaScript（无框架依赖）
- 目标：视觉和交互 100% 还原
- 性能要求：Lighthouse 评分 ≥ 90

请按照以下 6 个阶段执行：

== 阶段 1：视觉资产收集 ==
1. 使用 web_search 工具搜索 CustomInk 首页的最新截图和设计信息
2. 提取以下设计数据：
   - 主色调和配色方案（十六进制值）
   - 字体族、字号、行高、字重
   - 间距系统（padding, margin）
   - 圆角、阴影、渐变
   - 响应式断点
3. 创建 style-guide.md 文件，记录所有设计令牌

== 阶段 2：HTML 结构搭建 ==
1. 阅读当前 index.html 文件
2. 对比 CustomInk 首页，检查结构是否完整：
   - header#top-toolbar: 顶部工具条
   - header#primary-header: 主导航
   - main: 主要内容区块
     - section#hero
     - section#service-promise
     - section#categories
     - section#brand-showcase
     - section#testimonials
     - section#enterprise
   - footer#footer
3. 使用语义化 HTML5 标签
4. 添加完整的 ARIA 无障碍属性
5. 为每段代码添加注释和时间戳

== 阶段 3：CSS 样式实现 ==
1. 阅读当前 styles.css 文件
2. 根据 style-guide.md 中的设计令牌，精确实现样式：
   - 使用 CSS 变量（:root）存储所有设计值
   - 移动端优先的响应式设计
   - 精确匹配间距、颜色、字体
   - 添加所有交互状态（:hover, :focus, :active）
3. 逐个区块实现，每完成一个区块在终端对比显示
4. 确保像素级精确度（误差 ≤ 2px）

== 阶段 4：JavaScript 交互实现 ==
1. 阅读当前 app.js 文件
2. 实现以下交互功能：
   - 移动端导航展开/收起（使用 ARIA 状态）
   - 滚动时 header 粘性定位（debounce）
   - Hero 轮播图自动播放（5 秒切换）
   - Testimonials 自动切换（8 秒切换）
   - 图片懒加载（Intersection Observer）
   - 平滑滚动
3. 使用 ES6+ 语法，添加注释
4. 避免全局命名污染

== 阶段 5：响应式测试 ==
1. 在多个设备断点测试：
   - 375px, 768px, 1024px, 1280px, 1920px
2. 检查布局是否正常，记录问题
3. 修复所有响应式问题
4. 确保触摸目标 ≥ 44×44px

== 阶段 6：性能优化 ==
1. 运行 Lighthouse 性能审计
2. 压缩图片到合适尺寸和格式（WebP）
3. 添加 preload 关键资源
4. 延迟加载非关键图片
5. 添加 meta 标签和 JSON-LD 结构化数据
6. 确保最终 Lighthouse 评分 ≥ 90

执行原则：
- 每个修改添加注释和时间戳
- 使用语义化 HTML
- 添加完整的 ARIA 属性
- 移动端优先的响应式设计
- 所有交互平滑流畅
- 代码整洁易于维护

请开始执行阶段 1，并在完成每个阶段后报告进度。
```

---

## 方案二：分阶段提示词（多 Agent 协作）

### 阶段 1 提示词：视觉资产收集

**发送给**: Agent A（视觉分析师）

```
你的角色：前端视觉分析师
任务：收集 CustomInk 首页的所有视觉设计数据

步骤：
1. 使用 web_search 工具搜索 CustomInk 首页的最新信息和设计
2. 提取以下数据：
   - 颜色系统：Primary、Secondary、Background、Text、Border（十六进制值）
   - 字体系统：Font Family、字号、行高、字重
   - 间距系统：所有 padding、margin 值
   - 阴影和圆角：所有 box-shadow、border-radius
   - 响应式断点：移动端、平板、桌面
3. 创建 style-guide.md 文件，按以下格式记录：

```markdown
# CustomInk 视觉设计指南

## 颜色系统
- Primary: #_____
- Secondary: #_____
...

## 字体系统
- Font Family: _____
...

## 间距系统
- Base Unit: 4px
- Scale: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
...

## 响应式断点
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px
```

完成后，报告文件路径和关键设计值。
```

---

### 阶段 2 提示词：HTML 结构验证

**发送给**: Agent B（HTML 专家）

```
你的角色：HTML 结构专家
任务：验证并优化 CustomInk 首页的 HTML 结构

要求：
1. 读取当前 index.html 文件
2. 对比原始网站，检查结构是否完整
3. 使用语义化 HTML5 标签（header, nav, section, article, aside, footer）
4. 添加完整的 ARIA 无障碍属性
5. 为每段代码添加注释和时间戳

验收标准：
- ✅ 语义化标签使用正确
- ✅ ARIA 属性完整（aria-label, aria-labelledby, role 等）
- ✅ ID 和 class 命名清晰一致
- ✅ HTML 格式整洁（2 空格缩进）

请检查 index.html，如发现任何问题，立即修复。
```

---

### 阶段 3 提示词：CSS 精确样式

**发送给**: Agent B（CSS 专家）

```
你的角色：CSS 样式专家
任务：为 CustomInk 首页实现像素级精确的 CSS 样式

前置文件：style-guide.md（由 Agent A 提供）

要求：
1. 读取 style-guide.md 中的设计令牌
2. 使用 CSS 变量（:root）定义所有设计值
3. 移动端优先的响应式设计
4. 精确匹配以下属性：
   - 颜色值（误差 ≤ 1px）
   - 字体大小和行高
   - 内外边距
   - 边框圆角和阴影
5. 添加所有交互状态（:hover, :focus, :active, :visited）
6. 使用现代 CSS（Flexbox/Grid）
7. 添加平滑过渡动画（transition）

实现顺序：
1. 基础重置和 :root 变量
2. 全局布局（container, grid）
3. Top Toolbar
4. Primary Header
5. Hero Section
6. Service Promise
7. Categories Grid
8. Brand Showcase
9. Testimonials
10. Enterprise
11. Footer

每完成一个区块，在终端对比显示，确保像素级精确度（误差 ≤ 2px）。

请开始实现 styles.css。
```

---

### 阶段 4 提示词：JavaScript 交互实现

**发送给**: Agent B（JavaScript 专家）

```
你的角色：JavaScript 交互专家
任务：为 CustomInk 首页添加所有 JavaScript 交互效果

要求：
1. 实现以下功能：
   - 移动端导航展开/收起（使用 aria-expanded）
   - 滚动时 header 粘性定位（使用 debounce 优化）
   - Hero 轮播图自动播放（5 秒切换，支持手动）
   - Testimonials 自动切换（8 秒）
   - 图片懒加载（Intersection Observer API）
   - 平滑滚动到锚点
   - 表单验证（如有）
2. 使用 ES6+ 语法（const, let, 箭头函数）
3. 避免全局命名污染（IIFE 或 ES Modules）
4. 添加详细注释
5. 确保性能优化（debounce, passive listeners）

请开始实现 app.js。
```

---

### 阶段 5 提示词：响应式测试

**发送给**: Agent C（QA 测试专家）

```
你的角色：响应式测试专家
任务：测试 CustomInk 首页在所有设备上的表现

测试清单：
1. 在 Chrome DevTools 中测试以下视口：
   - 375px (iPhone SE)
   - 390px (iPhone 12/13/14 Pro)
   - 768px (iPad)
   - 1024px (iPad Pro)
   - 1280px (MacBook Air)
   - 1920px (Desktop)
2. 检查每个区块的布局是否正常
3. 检查文字大小和可读性
4. 检查图片是否拉伸变形
5. 检查触摸目标是否足够大（≥ 44×44px）
6. 检查导航菜单是否正常展开/收起

记录所有问题，并修复它们。

请开始测试并报告结果。
```

---

### 阶段 6 提示词：性能优化

**发送给**: Agent C（性能优化专家）

```
你的角色：性能优化专家
任务：优化 CustomInk 首页的加载速度和用户体验

要求：
1. 使用 Lighthouse 运行性能审计（目标 ≥ 90 分）
2. 压缩所有图片到合适尺寸和格式（WebP + 后备）
3. 合并并压缩 CSS/JS（生产环境）
4. 添加 preload 关键资源
5. 延迟加载非关键图片（loading="lazy"）
6. 添加 meta 标签：
   - viewport
   - description
   - Open Graph
7. 实现 JSON-LD 结构化数据（Organization, WebSite）
8. 检查并修复所有可访问性问题

完成后，提供优化前后的 Lighthouse 报告对比。

请开始优化并报告结果。
```

---

## 方案三：快速迭代提示词

### 迭代 1：修复颜色问题

```
任务：修复 CustomInk 首页的颜色不匹配问题

具体问题：
- Hero 区域的背景色不正确
- CTA 按钮颜色与设计不符
- 文字颜色对比度不够

要求：
1. 参考原始网站 https://www.customink.com/
2. 使用 Chrome DevTools 提取准确的颜色值
3. 更新 styles.css 中的颜色变量
4. 确保对比度符合 WCAG 标准（AA 级）

请立即修复。
```

---

### 迭代 2：修复布局问题

```
任务：修复 CustomInk 首页的布局问题

具体问题：
- 平板设备上 categories grid 显示错乱
- Footer 三列布局在小屏幕上堆叠

要求：
1. 检查 @media 查询是否正确
2. 使用 Flexbox/Grid 重新实现布局
3. 添加响应式断点
4. 确保在所有设备上正常显示

请立即修复。
```

---

### 迭代 3：优化性能

```
任务：优化 CustomInk 首页的加载性能

当前问题：
- Lighthouse Performance 评分：75
- LCP（最大内容绘制）时间过长
- 图片未优化

要求：
1. 压缩所有图片
2. 添加图片懒加载
3. 使用 WebP 格式 + 后备
4. 添加关键 CSS 内联
5. 目标 Lighthouse Performance ≥ 90

请立即优化。
```

---

## Agent 交接规范

### 从 Agent A 传给 Agent B

```
Agent A 已完成：视觉资产收集
文件：style-guide.md
状态：✅ 完成

Agent B，请基于 style-guide.md 实现 HTML/CSS/JS 代码。
```

---

### 从 Agent B 传给 Agent C

```
Agent B 已完成：HTML/CSS/JS 实现
文件：index.html, styles.css, app.js
状态：✅ 完成，代码质量良好

Agent C，请测试响应式布局并优化性能。
```

---

## 常见问题提示词

### Q: 如何让 Agent 截图对比？

```
任务：截图对比当前实现与原始网站

步骤：
1. 打开 https://www.customink.com/ 并截图
2. 打开本地 index.html 并截图
3. 在图片编辑软件中叠加对比
4. 记录所有像素差异

请完成并报告差异。
```

---

### Q: 如何让 Agent 忽略现有代码？

```
任务：从头开始实现 CustomInk 首页

注意：请忽略当前 index.html, styles.css, app.js 的所有内容。
请完全按照原始网站重新实现。
```

---

### Q: 如何让 Agent 只关注某个区块？

```
任务：仅修复 Hero Section 的样式问题

范围：只修改 styles.css 中 #hero 相关的样式
其他部分：保持不变

请立即修复。
```

---

## 执行检查清单

在发送提示词前，确认：

- [ ] 目标明确：要复刻的具体内容
- [ ] 限制清楚：技术栈、性能要求
- [ ] 步骤详细：每个步骤可执行
- [ ] 验收标准：明确的成功标准
- [ ] 上下文完整：提供必要的文件路径和参考

---

## 最佳实践

1. **每次只聚焦一个阶段**，避免信息过载
2. **提供明确的验收标准**，让 Agent 知道何时完成
3. **使用示例代码**，帮助 Agent 理解预期格式
4. **及时反馈**，在每个阶段完成后检查进度
5. **迭代优化**，先做核心功能再优化细节

---

**更新日志**:
- 2025-01-23: 初版创建
