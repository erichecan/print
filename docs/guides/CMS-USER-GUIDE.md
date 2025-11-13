# 内容管理系统（CMS）使用指南

**创建日期**: 2025-11-02  
**版本**: 1.0

---

## 📋 概述

内容管理系统（CMS）用于管理网站上的非产品图片，包括：
- **Hero区域图片**：首页主展示区域的4张产品卡片
- **品牌Logo**：10个合作品牌标识
- **类别图片**：产品分类展示图片

产品图片由后台数据库管理，不在CMS范围内。

---

## 🚀 快速开始

### 1. 访问CMS管理界面

在浏览器中打开：
```
admin/content-manager.html
```

### 2. 管理图片

#### 方式一：通过URL更新（推荐）

1. 准备好图片文件，上传到对应目录：
   - Hero图片 → `assets/hero/`
   - 品牌Logo → `assets/brands/`
   - 类别图片 → `assets/categories/`

2. 在CMS界面中：
   - 找到要更新的图片项
   - 在"图片路径"输入框中输入完整路径（如 `/assets/hero/hero-card-tee.jpg`）
   - 点击"Update"按钮

3. 点击页面底部的"Save All Changes"保存所有更改

#### 方式二：直接编辑JSON文件（高级）

1. 打开 `assets/content-config.json`
2. 修改对应的图片路径
3. 保存文件

---

## 📁 文件结构

```
assets/
├── content-config.json       # 图片配置文件（CMS核心）
├── hero/
│   ├── hero-card-tee.jpg     # T恤卡片
│   ├── hero-card-bottle.jpg  # 水杯卡片
│   ├── hero-card-hat.jpg     # 帽子卡片
│   └── hero-card-bag.jpg     # 包袋卡片
├── brands/
│   ├── nike.svg
│   ├── carhartt.svg
│   ├── new-era.svg
│   └── ...（10个品牌Logo）
└── categories/
    ├── cat-tshirt.webp
    ├── cat-sweatshirt.webp
    └── ...（10个类别图片）
```

---

## 🔧 图片规格要求

### Hero图片
- **尺寸**: 800x600px
- **格式**: JPG/WebP
- **大小**: 建议 < 200KB

### 品牌Logo
- **尺寸**: 100x40px
- **格式**: SVG（推荐）或 PNG
- **大小**: 建议 < 50KB

### 类别图片
- **尺寸**: 200x200px
- **格式**: WebP（推荐）或 PNG
- **大小**: 建议 < 100KB

---

## 📥 下载真实图片

### 方式一：使用PowerShell脚本（Windows）

在项目根目录运行：
```powershell
.\scripts\download-images.ps1
```

### 方式二：使用Node.js脚本

```bash
node scripts/download-images.js
```

### 方式三：手动下载

1. 查看 `IMAGE-REPLACEMENT-LIST.md` 了解需要下载的图片
2. 从免费图片库下载（Unsplash, Pexels等）
3. 按照规格裁剪并保存到对应目录
4. 在CMS界面中更新路径

---

## 🎨 使用CMS界面

### 功能说明

1. **图片预览**
   - 每个图片项显示当前预览
   - 点击预览区域可上传新图片

2. **URL输入**
   - 输入图片的完整路径（从网站根目录开始）
   - 例如：`/assets/hero/hero-card-tee.jpg`

3. **更新按钮**
   - 点击"Update"更新单个图片
   - 或使用"Save All Changes"批量保存

4. **重新加载**
   - 点击"Reload Config"从JSON文件重新加载配置

---

## ⚠️ 注意事项

1. **图片路径**
   - 必须使用绝对路径（以`/`开头）
   - 路径必须与文件系统中的实际路径匹配

2. **文件格式**
   - 使用WebP格式可减小文件大小
   - SVG格式适用于Logo和图标

3. **图片优化**
   - 上传前压缩图片以提高加载速度
   - 使用适当的尺寸避免浪费带宽

4. **备份**
   - 修改前备份 `content-config.json`
   - 建议使用Git进行版本控制

---

## 🔄 与前端集成

CMS配置会自动应用到前端页面：
- `home.html` - Hero区域和品牌Logo
- `long-sleeve.html` - 产品列表图片
- `product-hoodie.html` - 产品详情图片

前端通过 `scripts/image-loader.js` 自动加载JSON配置中的图片。

---

## 🐛 故障排除

### 图片不显示？

1. **检查路径**
   - 确认路径是否正确（大小写敏感）
   - 确认文件是否存在

2. **检查JSON格式**
   - 使用JSON验证器检查语法
   - 确保逗号和引号正确

3. **清除缓存**
   - 刷新浏览器缓存（Ctrl+F5）
   - 检查浏览器控制台是否有错误

### CMS界面无法加载？

1. **检查文件路径**
   - 确认 `content-config.json` 存在
   - 确认路径访问权限

2. **检查浏览器控制台**
   - 查看是否有JavaScript错误
   - 检查网络请求是否成功

---

## 📚 相关文件

- `assets/content-config.json` - 图片配置JSON
- `scripts/image-loader.js` - 前端图片加载器
- `scripts/content-manager.js` - CMS管理脚本
- `scripts/download-images.js` - 图片下载脚本（Node.js）
- `scripts/download-images.ps1` - 图片下载脚本（PowerShell）
- `IMAGE-REPLACEMENT-LIST.md` - 图片替换清单

---

## 🎯 最佳实践

1. **定期备份配置**
   - 修改前导出JSON文件
   - 使用版本控制跟踪更改

2. **图片命名规范**
   - 使用有意义的文件名
   - 保持命名一致性

3. **性能优化**
   - 压缩图片减小文件大小
   - 使用WebP格式
   - 考虑使用CDN加速

4. **测试更改**
   - 修改后在多个页面测试
   - 检查不同设备上的显示效果

---

**需要帮助？** 请参考 `IMAGE-REPLACEMENT-LIST.md` 了解详细的图片要求。

