# 品牌 Logo 配置说明
# [2025-01-29 13:50:00] Custom Ink 品牌 Logo 爬取和存储说明

## 📋 概述

所有品牌 logo 都是从 **Custom Ink** 网站爬取的，存储在 GCP 前端服务的 `public/assets/brands/` 目录中。

## 🔗 来源

- **爬取来源**: https://www.customink.com/brands
- **爬取脚本**: `backend/scripts/scrape-customink-brand-logos.js`
- **存储位置**: `apps/web/public/assets/brands/`

## 📁 存储路径

### 本地开发
- 路径: `apps/web/public/assets/brands/{brand-slug}.{ext}`
- 访问: `http://localhost:3000/assets/brands/{brand-slug}.{ext}`

### GCP 生产环境
- 路径: `apps/web/public/assets/brands/{brand-slug}.{ext}`
- 访问: `https://print-main-frontend-234065158862.us-central1.run.app/assets/brands/{brand-slug}.{ext}`
- 在代码中使用相对路径 `/assets/brands/{brand-slug}.{ext}` 即可，浏览器会自动解析为当前域名

## 🏷️ 品牌列表（21个品牌，与 Custom Ink 一致）

### Row 1 (7个品牌)
1. **Nike** - `/assets/brands/nike.svg`
2. **Carhartt** - `/assets/brands/carhartt.svg`
3. **New Era** - `/assets/brands/new-era.png`
4. **The North Face** - `/assets/brands/northface.svg`
5. **Stanley** - `/assets/brands/stanley.svg`
6. **Patagonia** - `/assets/brands/patagonia.svg`
7. **Champion** - `/assets/brands/champion.png`

### Row 2 (7个品牌)
8. **Comfort Colors** - `/assets/brands/comfort-colors.svg`
9. **Ogio** - `/assets/brands/ogio.svg`
10. **Peter Millar** - `/assets/brands/peter-millar.svg`
11. **TravisMathew** - `/assets/brands/travismathew.svg`
12. **Moleskine** - `/assets/brands/moleskine.svg`
13. **Richardson** - `/assets/brands/richardson.png`
14. **Koozie** - `/assets/brands/koozie.svg`

### Row 3 (7个品牌)
15. **Gildan** - `/assets/brands/gildan.png`
16. **Adidas** - `/assets/brands/adidas.png`
17. **JBL** - `/assets/brands/jbl.svg`
18. **Herschel Supply Co.** - `/assets/brands/herschel.svg`
19. **BIC** - `/assets/brands/bic.svg`
20. **Hydro Flask** - `/assets/brands/hydro-flask.png`
21. **Columbia** - `/assets/brands/columbia.png`

## 🚀 爬取和更新 Logo

### 运行爬取脚本

```bash
cd backend
node scripts/scrape-customink-brand-logos.js
```

脚本会：
1. 访问 Custom Ink 品牌页面
2. 识别所有品牌 logo
3. 下载到 `apps/web/public/assets/brands/` 目录
4. 生成 `brands-list.json` 文件

### 文件命名规则

- 使用品牌 slug（小写，连字符分隔）
- 保留原始文件扩展名（.svg, .png 等）
- 例如：`new-era.png`, `comfort-colors.svg`

## 📝 代码使用

### 前端组件

```tsx
// 使用相对路径，生产环境会自动解析为前端服务URL
const brandLogos = [
  { id: 'brand-1', name: 'Nike', src: '/assets/brands/nike.svg' },
  { id: 'brand-2', name: 'Carhartt', src: '/assets/brands/carhartt.svg' },
  // ...
];

// 在组件中使用
{brandLogos.map((brand) => (
  <img src={brand.src} alt={brand.name} />
))}
```

### URL 解析

- **开发环境**: `/assets/brands/nike.svg` → `http://localhost:3000/assets/brands/nike.svg`
- **生产环境**: `/assets/brands/nike.svg` → `https://print-main-frontend-234065158862.us-central1.run.app/assets/brands/nike.svg`

## ✅ 验证清单

- [ ] 所有 21 个品牌的 logo 文件存在于 `apps/web/public/assets/brands/` 目录
- [ ] Logo 文件名称与代码中的路径一致
- [ ] Logo 可以从 GCP 前端服务正常访问
- [ ] Logo 显示样式与 Custom Ink 一致

## 🔍 检查 Logo 文件

```bash
# 列出所有品牌 logo 文件
ls -la apps/web/public/assets/brands/

# 应该看到 21 个品牌的文件（可能包含多种格式）
```

## 📚 相关文件

- 爬取脚本: `backend/scripts/scrape-customink-brand-logos.js`
- Logo 存储: `apps/web/public/assets/brands/`
- 品牌列表: `apps/web/public/assets/brands/brands-list.json`
- 前端组件: `apps/web/src/components/home/HomeClient.tsx`

---

**最后更新**: 2025-01-29 13:50:00

