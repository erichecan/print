# 字体管理指南

**更新时间**: 2025-01-30 18:50:00

## 概述

Design Lab 的字体管理系统支持两种方式：
1. **配置文件管理**（当前实现）- 在 `apps/web/src/data/fonts.ts` 中管理
2. **数据库管理**（未来扩展）- 可以通过后台管理界面管理字体

## 当前实现：配置文件管理

### 添加新字体

编辑 `apps/web/src/data/fonts.ts` 文件，在 `FONTS_CONFIG` 数组中添加新字体：

```typescript
{
  name: 'Font Name',              // 字体名称（必须唯一）
  displayName: 'Display Name',    // 显示名称（可选）
  previewText: 'Aa',              // 预览文本
  category: 'latin',              // 字体分类
  source: 'google',               // 字体来源：'system' | 'google' | 'custom'
  googleFontFamily: 'Font Name',  // Google Fonts 家族名称（如果 source 是 google）
  weights: ['400', '500', '700'], // 字体粗细（可选）
  isActive: true,                 // 是否启用（默认 true）
  sortOrder: 1,                   // 排序顺序
}
```

### 字体分类

支持的分类：
- `latin` - 拉丁字体
- `chinese` - 中文字体（简体/繁体）
- `japanese` - 日文字体
- `hindi` - Hindi 字体（Devanagari）
- `arabic` - 阿拉伯字体（预留）
- `korean` - 韩文字体（预留）
- `thai` - 泰文字体（预留）

### 字体来源

1. **系统字体** (`source: 'system'`)
   - 使用系统已安装的字体
   - 不需要额外加载
   - 示例：Arial, Helvetica, SimHei

2. **Google Fonts** (`source: 'google'`)
   - 使用 Google Fonts 免费字体
   - 需要在 `layout.tsx` 中加载
   - 示例：Noto Sans SC, Roboto, Open Sans

3. **自定义字体** (`source: 'custom'`)
   - 使用自定义上传的字体文件
   - 需要将字体文件放在 `public/fonts/` 目录
   - 需要在 CSS 中定义 `@font-face`

### 添加 Google Fonts 字体

1. **在 `fonts.ts` 中添加字体配置**：
```typescript
{
  name: 'Poppins',
  previewText: 'Aa',
  category: 'latin',
  source: 'google',
  googleFontFamily: 'Poppins',
  weights: ['400', '600', '700'],
  sortOrder: 26,
}
```

2. **在 `layout.tsx` 中加载字体**：
```typescript
import { Poppins } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

// 在 body className 中添加
<body className={`${inter.className} ${poppins.variable} ...`}>
```

### 添加系统字体

直接在 `fonts.ts` 中添加配置即可，无需额外步骤：

```typescript
{
  name: 'Arial',
  previewText: 'Aa',
  category: 'latin',
  source: 'system',
  sortOrder: 1,
}
```

### 添加自定义字体

1. **将字体文件放在 `public/fonts/` 目录**：
   - 例如：`public/fonts/CustomFont-Regular.woff2`

2. **在 `globals.css` 中定义 `@font-face`**：
```css
@font-face {
  font-family: 'Custom Font';
  src: url('/fonts/CustomFont-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

3. **在 `fonts.ts` 中添加配置**：
```typescript
{
  name: 'Custom Font',
  previewText: 'Aa',
  category: 'latin',
  source: 'custom',
  sortOrder: 100,
}
```

## 免费字体资源推荐

### Google Fonts（免费）

**拉丁字体**：
- Roboto, Open Sans, Lato, Montserrat, Oswald
- Poppins, Raleway, Playfair Display, Merriweather
- Source Sans Pro, Nunito, Ubuntu, PT Sans

**中文字体**：
- Noto Sans SC（简体中文）
- Noto Sans TC（繁体中文）

**日文字体**：
- Noto Sans JP

**Hindi 字体**：
- Noto Sans Devanagari

**其他语言**：
- Noto Sans Arabic（阿拉伯语）
- Noto Sans KR（韩语）
- Noto Sans Thai（泰语）

访问 [Google Fonts](https://fonts.google.com/) 查看更多免费字体。

### 系统字体（无需加载）

**Windows**：
- SimHei（黑体）, SimSun（宋体）, Microsoft YaHei（微软雅黑）
- KaiTi（楷体）, FangSong（仿宋）
- MS Gothic, MS Mincho（日文）

**macOS**：
- PingFang SC, PingFang TC
- Hiragino Sans GB, STHeiti

**Linux**：
- WenQuanYi Micro Hei, AR PL UMing CN

## 未来扩展：数据库管理

### 数据库模型设计

可以创建 `Font` 模型，类似 `ArtAsset`：

```prisma
model Font {
  id              String   @id @default(uuid())
  name            String
  displayName     String?
  previewText     String
  category        FontCategory
  source          FontSource
  googleFontFamily String?
  weights         String[]  // JSON array
  isActive        Boolean   @default(true)
  sortOrder       Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([category])
  @@index([isActive])
  @@map("fonts")
}

enum FontCategory {
  LATIN
  CHINESE
  JAPANESE
  HINDI
  ARABIC
  KOREAN
  THAI
}

enum FontSource {
  SYSTEM
  GOOGLE
  CUSTOM
}
```

### 后台管理界面

可以创建 `/admin/fonts` 页面，类似 `/admin/art-assets`：
- 列表显示所有字体
- 添加/编辑/删除字体
- 启用/禁用字体
- 调整排序顺序

### API 端点

```typescript
// GET /api/fonts - 获取所有字体
// GET /api/fonts/:id - 获取单个字体
// POST /api/admin/fonts - 创建字体
// PUT /api/admin/fonts/:id - 更新字体
// DELETE /api/admin/fonts/:id - 删除字体
```

## 最佳实践

1. **字体数量控制**：建议每个分类不超过 20-30 个字体，避免选择器过长
2. **预览文本**：使用对应语言的代表性字符作为预览文本
3. **排序顺序**：常用字体放在前面（sortOrder 较小）
4. **字体粗细**：Google Fonts 字体建议包含 400（正常）和 700（粗体）
5. **性能优化**：只加载实际使用的 Google Fonts 字体，避免加载过多字体文件

## 常见问题

### Q: 如何禁用某个字体？
A: 在 `fonts.ts` 中设置 `isActive: false`，或从数组中移除该字体。

### Q: 字体在 Canvas 上显示不正确？
A: 确保：
1. Google Fonts 字体已在 `layout.tsx` 中加载
2. 自定义字体已在 CSS 中定义 `@font-face`
3. 字体名称与配置中的 `name` 字段完全一致

### Q: 如何添加更多 Google Fonts？
A: 参考"添加 Google Fonts 字体"部分，需要同时更新 `fonts.ts` 和 `layout.tsx`。

### Q: 系统字体在不同操作系统上显示不同？
A: 这是正常的，系统字体依赖于操作系统。建议使用 Google Fonts 字体以获得一致的跨平台体验。

