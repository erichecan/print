# Design Lab 完整测试计划实施总结

**创建时间**: 2025-01-27 12:00:00  
**状态**: ✅ **所有测试文件已创建**

---

## 测试文件清单

### 测试辅助工具

1. **`apps/web/tests/e2e/fixtures/design-lab-helpers.ts`**
   - Design Lab 页面导航辅助函数
   - 对象操作辅助函数（上传、添加文字、添加素材）
   - 报价流程辅助函数
   - 等待与验证辅助函数

2. **`apps/web/tests/e2e/fixtures/design-lab-test-data.ts`**
   - 测试图片文件路径
   - 测试文字内容
   - 测试产品数据
   - 测试尺码配置

### 测试文件（按里程碑）

#### M1: 设计器基础功能测试
**文件**: `apps/web/tests/e2e/design-lab-basic.spec.ts`

**测试内容**:
- ✅ 页面加载与布局验证（Header、Rail、Canvas、Sidebar、Bottom Bar）
- ✅ Upload 功能（Browse、Drag & Drop、文件校验）
- ✅ Add Text 功能（输入、Add To Design、Edit Text 面板）
- ✅ Add Art 功能（分类浏览、素材选择、Edit Art 面板）
- ✅ Product Colors 功能（颜色选择、尺码显示）
- ✅ 视图切换（Front/Back/Sleeve Design/Zoom）
- ✅ Undo/Redo 功能
- ✅ Layering 功能（Bring to Front、Send to Back、Forward、Backward）
- ✅ Center 功能
- ✅ 安全区显示与校验

#### M2: Names & Numbers 功能测试
**文件**: `apps/web/tests/e2e/design-lab-names-numbers.spec.ts`

**测试内容**:
- ✅ Add Names and Numbers 入口
- ✅ Tools 面板（Step 1: Add Names/Numbers、Side、Height、Color）
- ✅ My List 弹窗（添加名字/号码、尺码选择、Manage List、Totals）
- ✅ My Quantities 弹窗（尺码数量配置、额外不带 N&N 选项）
- ✅ 尺码与颜色一致性校验

#### M3: 报价与下单流程测试
**文件**: `apps/web/tests/e2e/design-lab-pricing-flow.spec.ts`

**测试内容**:
- ✅ Get Price 起始页（Buy & Ship / Start a Fundraiser）
- ✅ Ordering Options（Shipping、Sizes & Quantities、Payment）
- ✅ Quantity 页面（尺码网格、加价文案、Add Women's、推荐样式）
- ✅ Order Options 报价结果页（价格显示、统计徽章、促销文案、配送选项）
- ✅ Content Check 内容合规确认
- ✅ Add to Cart 流程
- ✅ 购物车页面（订单项、Delivery Options、Order Summary、折扣码）

#### M4: 对象编辑功能测试
**文件**: `apps/web/tests/e2e/design-lab-object-editing.spec.ts`

**测试内容**:
- ✅ Upload 对象编辑（Size、Edit Colors、Make One Color、Remove Background、Crop、Rotation）
- ✅ Text 对象编辑（Change Font、Edit Color、Rotation、Outline、Text Shape、Text Size、Text Alignment）
- ✅ Art 对象编辑（Flip、Duplicate、Rotation、Make One Color、Edit Colors、Change Art、Art Size）
- ✅ 对象选中与删除
- ✅ 对象拖拽与缩放
- ✅ 对象旋转

#### M5: 字体与素材库测试
**文件**: `apps/web/tests/e2e/design-lab-fonts-artwork.spec.ts`

**测试内容**:
- ✅ 字体选择器（分类浏览、搜索、应用字体）
- ✅ 素材库浏览（分类导航、搜索、分页/懒加载）
- ✅ 素材应用与替换

#### M6: 保存与分享功能测试
**文件**: `apps/web/tests/e2e/design-lab-save-share.spec.ts`

**测试内容**:
- ✅ Save 功能（保存设计、设计列表）
- ✅ Share 功能（生成链接、复制链接）
- ✅ 设计恢复（刷新后恢复、从列表加载）

#### M7: 无障碍与性能测试
**文件**: `apps/web/tests/e2e/design-lab-a11y-performance.spec.ts`

**测试内容**:
- ✅ 键盘导航（Tab、Enter、Esc、方向键）
- ✅ ARIA 标签验证
- ✅ 焦点样式验证
- ✅ 页面加载性能
- ✅ 画布渲染性能

#### Custom Ink 流程验证测试
**文件**: `apps/web/tests/e2e/customink-flow-verification.spec.ts`

**测试内容**:
- ✅ 访问 Custom Ink Design Lab (`https://www.customink.com/ndx`)
- ✅ 测试 Upload 流程（对比 PRD 描述）
- ✅ 测试 Add Text 流程（对比 PRD 描述）
- ✅ 测试 Add Art 流程（对比 PRD 描述）
- ✅ 测试 Product Colors 流程（对比 PRD 描述）
- ✅ 测试 Names & Numbers 流程（对比 PRD 描述）
- ✅ 测试 Get Price 流程（对比 PRD 描述）
- ✅ 测试购物车流程（对比 PRD 描述）
- ✅ 生成 PRD 对比报告

---

## 测试统计

- **测试文件总数**: 8 个
- **辅助工具文件**: 2 个
- **测试用例总数**: 约 150+ 个测试用例
- **覆盖功能模块**: 7 个主要模块 + Custom Ink 验证

---

## 运行测试

### 运行所有测试

```bash
cd apps/web
npm run test:e2e
```

### 运行特定测试文件

```bash
# M1: 基础功能测试
npm run test:e2e design-lab-basic.spec.ts

# M2: Names & Numbers 测试
npm run test:e2e design-lab-names-numbers.spec.ts

# M3: 报价流程测试
npm run test:e2e design-lab-pricing-flow.spec.ts

# M4: 对象编辑测试
npm run test:e2e design-lab-object-editing.spec.ts

# M5: 字体素材测试
npm run test:e2e design-lab-fonts-artwork.spec.ts

# M6: 保存分享测试
npm run test:e2e design-lab-save-share.spec.ts

# M7: 无障碍性能测试
npm run test:e2e design-lab-a11y-performance.spec.ts

# Custom Ink 验证测试
npm run test:e2e customink-flow-verification.spec.ts
```

### 运行特定浏览器

```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

---

## 测试报告

测试运行后会在以下位置生成报告：

- **HTML 报告**: `apps/web/playwright-report/index.html`
- **截图**: `test-results/` 目录
- **视频**: 失败测试的视频会保存在 `test-results/` 目录
- **Custom Ink 验证报告**: `test-results/customink-verification/prd-comparison-report.json`

---

## 注意事项

1. **环境配置**: 确保后端服务正常运行（端口 4000）
2. **测试数据**: 某些测试需要测试图片文件，确保文件路径正确
3. **Custom Ink 测试**: 需要网络连接，可能受到反爬虫机制影响
4. **超时设置**: Custom Ink 验证测试设置了 5 分钟超时
5. **截图记录**: 所有关键步骤都会自动截图保存

---

## 下一步

1. **修复环境问题**: 确保后端依赖（如 socket.io）已安装
2. **运行测试**: 执行完整测试套件
3. **修复问题**: 根据测试结果修复发现的问题
4. **持续集成**: 将测试集成到 CI/CD 流程中

---

## 测试覆盖范围

### ✅ 已覆盖的功能

- [x] 页面布局与导航
- [x] Upload 功能
- [x] Add Text 功能
- [x] Add Art 功能
- [x] Product Colors 功能
- [x] Names & Numbers 功能
- [x] 视图切换
- [x] 对象编辑
- [x] 字体选择器
- [x] 素材库浏览
- [x] 保存与分享
- [x] 报价流程
- [x] 购物车流程
- [x] 无障碍功能
- [x] 性能指标

### 📝 待补充的测试（可选）

- [ ] 错误处理测试
- [ ] 边界条件测试
- [ ] 并发操作测试
- [ ] 移动端响应式测试

---

**测试计划实施完成！** 🎉

