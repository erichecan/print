# Custom Ink Design Lab PRD 3.0 验证测试说明

## 运行测试

### 前置条件

1. 确保已安装 Playwright：
```bash
cd apps/web
npm install
npx playwright install chromium
```

2. 确保有网络连接（需要访问 Custom Ink 网站）

### 运行测试

```bash
cd apps/web

# 运行完整验证测试（headed 模式，可以看到浏览器操作）
npx playwright test tests/e2e/customink-prd-verification.spec.ts --project=chromium --headed

# 或者 headless 模式
npx playwright test tests/e2e/customink-prd-verification.spec.ts --project=chromium
```

### 注意事项

1. **登录处理**：如果 Custom Ink 需要登录，测试会在浏览器中暂停，等待手动登录。请在 30 秒内完成登录。

2. **测试时间**：完整测试可能需要 10-15 分钟，因为需要验证多个功能模块。

3. **截图保存**：所有截图会保存在 `test-results/customink-prd-verification/screenshots/` 目录。

## 查看报告

测试完成后，查看以下文件：

1. **JSON 报告**：`test-results/customink-prd-verification/report.json`
   - 结构化数据，可用于程序处理

2. **Markdown 报告**：`test-results/customink-prd-verification/report.md`
   - 可读性报告，包含：
     - 摘要统计
     - 各模块验证结果
     - 错误描述列表（PRD 描述与实际不符）
     - 未实现功能列表（PRD 有但 Custom Ink 未实现）

3. **截图**：`test-results/customink-prd-verification/screenshots/`
   - 按功能模块分类的截图

## 报告解读

### 状态说明

- ✅ **matched**: PRD 描述与实际实现完全匹配
- ⚠️ **partial**: 部分匹配或需要特定条件才能验证
- ❌ **mismatched**: PRD 描述与实际不符（错误描述）
- ❌ **not_found**: PRD 有但 Custom Ink 未实现（缺失功能）

### 重点关注

1. **错误描述列表**：PRD 中描述的功能与实际实现不符的地方
2. **未实现功能列表**：PRD 中要求但 Custom Ink 没有实现的功能

