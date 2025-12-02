# Custom Ink 产品预览分析指南

**创建时间**: 2025-12-02  
**目标**: 分析 Custom Ink Design Lab 的产品预览实现方式

## 分析目标

1. **Canvas 中央产品图片的实现方式**
   - 无 logo、高清、支持 front/back/侧面视图
   - 图片如何切换不同视图

2. **颜色变化机制**
   - 是否为预渲染的不同颜色图片
   - 图片 URL 结构模式
   - 颜色切换时的网络请求变化

3. **图片爬取**
   - 如果确认是预渲染的不同颜色图片，爬取所有产品的所有颜色和视图组合

## 使用方法

### 方法 1: 使用分析脚本

```bash
# 使用环境变量指定 URL
CUSTOMINK_URL='https://www.customink.com/designs/your-design-id' \
  node scripts/analyze-customink-preview.js

# 或使用命令行参数
node scripts/analyze-customink-preview.js 'https://www.customink.com/designs/your-design-id'
```

### 方法 2: 手动分析

1. 访问 Custom Ink Design Lab
2. 打开浏览器开发者工具
3. 切换到 Network 标签
4. 切换产品颜色和视图
5. 观察网络请求中的图片 URL 变化

## 分析脚本功能

`scripts/analyze-customink-preview.js` 脚本会：

1. ✅ 打开 Custom Ink Design Lab 页面
2. ✅ 监听所有网络请求（特别是图片请求）
3. ✅ 查找产品预览图片元素
4. ✅ 分析 Canvas 元素
5. ✅ 查找颜色选择器
6. ✅ 查找视图切换按钮（Front/Back/Side）
7. ✅ 提取图片 URL 模式
8. ✅ 保存分析结果到 `docs/customink-analysis/preview-analysis-result.json`
9. ✅ 保存页面截图

## 输出文件

- `docs/customink-analysis/preview-analysis-result.json` - 详细分析结果
- `docs/customink-analysis/customink-preview-full-page.png` - 页面截图

## 下一步

分析完成后，根据结果：

1. **如果确认是预渲染的不同颜色图片**：
   - 创建爬虫脚本爬取所有产品图片
   - 保存到本地目录结构

2. **如果是动态生成的图片**：
   - 分析动态生成机制
   - 确定是否可以模拟生成过程

## 注意事项

- 遵守 Custom Ink 的使用条款
- 合理设置请求延迟，避免对服务器造成压力
- 仅用于学习研究目的

