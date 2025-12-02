# CustomInk 页面功能分析

## 概述

本目录包含使用 Playwright 和 Chrome DevTools 对 CustomInk savedDesigns 页面的功能分析结果。

## 运行测试

```bash
cd apps/web

# 运行分析测试
npx playwright test tests/e2e/customink-analysis.spec.ts --project=chromium

# 或者使用 headed 模式（可以看到浏览器操作）
npx playwright test tests/e2e/customink-analysis.spec.ts --project=chromium --headed
```

## 测试流程

1. **访问 CustomInk 首页** - 自动检测是否需要登录
2. **登录处理** - 如果需要登录，测试会暂停等待用户手动登录
3. **导航到目标页面** - 自动导航到 `/ndx/#/savedDesigns`
4. **收集元素** - 识别所有交互元素（按钮、链接、表单等）
5. **截图** - 保存全页面截图和元素截图
6. **交互测试** - 模拟点击主要交互元素并记录结果
7. **生成文档** - 自动生成分析报告和元素清单

## 输出文件

- `INTERACTION-DESIGN.md` - 交互设计分析报告
- `ELEMENT-INVENTORY.json` - 完整的元素清单和交互数据
- `screenshots/full-page-*.png` - 全页面截图
- `screenshots/elements/element-*.png` - 各个元素的截图
- `screenshots/interactions/*.png` - 交互测试的截图

## 注意事项

- 测试需要访问外部网站（customink.com），需要网络连接
- 如果网站需要登录，测试会在浏览器中暂停，等待用户手动完成登录
- 测试会收集前50个元素的截图，避免生成过多文件
- 交互测试会尝试点击前20个可点击元素

## 技术细节

- 使用 Chrome DevTools Protocol (CDP) 捕获控制台日志、网络请求和 JavaScript 异常
- 自动识别多种类型的交互元素
- 生成详细的 Markdown 分析报告
- 保存完整的 JSON 数据供后续分析

