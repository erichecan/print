# 图片替换清单
**日期**: 2025-11-02  
**状态**: 进行中

---

## 📋 需要替换的占位图片

### 1. Hero区域图片（4张）
**位置**: `home.html` 第106-109行  
**规格**: 800x600px, JPG/WebP格式

| 图片名称 | 描述 | 当前位置 | 替换为 |
|---------|------|---------|--------|
| `hero-card-tee.jpg` | T恤产品卡片 | `assets/hero/` | 待下载 |
| `hero-card-bottle.jpg` | 水杯产品卡片 | `assets/hero/` | 待下载 |
| `hero-card-hat.jpg` | 帽子产品卡片 | `assets/hero/` | 待下载 |
| `hero-card-bag.jpg` | 包袋产品卡片 | `assets/hero/` | 待下载 |

**HTML元素**:
- `<div class="hero__card placeholder">`

---

### 2. 品牌Logo（需要补充5个）
**位置**: `home.html` 第148-157行  
**规格**: 100x40px, SVG格式

| Logo名称 | 当前状态 | 文件路径 |
|---------|---------|---------|
| Nike | ✅ 已有 | `assets/brands/nike.svg` |
| Carhartt | ✅ 已有 | `assets/brands/carhartt.svg` |
| The North Face | ✅ 已有 | `assets/brands/northface.svg` |
| Stanley | ✅ 已有 | `assets/brands/stanley.svg` |
| Patagonia | ✅ 已有 | `assets/brands/patagonia.svg` |
| New Era | ❌ 缺失 | `assets/brands/new-era.svg` |
| Champion | ❌ 缺失 | `assets/brands/champion.svg` |
| Adidas | ❌ 缺失 | `assets/brands/adidas.svg` |
| Columbia | ❌ 缺失 | `assets/brands/columbia.svg` |
| Hydro Flask | ❌ 缺失 | `assets/brands/hydro-flask.svg` |

**HTML元素**:
- `<div class="brandlogo placeholder">`

---

### 3. 产品列表页图片（6张）
**位置**: `long-sleeve.html` 第132, 142, 152, 162, 171, 180行  
**规格**: 400x400px, JPG/WebP格式

| 产品ID | 产品名称 | 图片路径 |
|--------|---------|---------|
| prod-001 | Gildan Long Sleeve T‑Shirt | `assets/products/prod-001.jpg` |
| prod-002 | Hanes EcoSmart Long Sleeve | `assets/products/prod-002.jpg` |
| prod-003 | Jerzees Dri‑Power Long Sleeve | `assets/products/prod-003.jpg` |
| prod-004 | Hanes Beefy Long Sleeve | `assets/products/prod-004.jpg` |
| prod-005 | Gildan Ultra Blend Long Sleeve | `assets/products/prod-005.jpg` |
| prod-006 | Hanes Performance Long Sleeve | `assets/products/prod-006.jpg` |

**HTML元素**:
- `<a class="product__image placeholder">`

---

### 4. 产品详情页图片（3张）
**位置**: `product-hoodie.html` 第101, 103-105行  
**规格**: 800x800px, JPG/WebP格式

| 图片类型 | 图片路径 |
|---------|---------|
| Front view | `assets/products/hoodie-front.jpg` |
| Back view | `assets/products/hoodie-back.jpg` |
| Detail view | `assets/products/hoodie-detail.jpg` |

**HTML元素**:
- `<div class="gallery__stage placeholder">`
- `<button class="thumb placeholder">`

---

### 5. 其他占位图片（后续处理）

#### 购物车页面
- `cart.html`: 2个产品缩略图占位符
- **规格**: 80x80px

#### 结账页面  
- `checkout.html`: 2个订单项缩略图占位符
- **规格**: 60x60px

#### 账户页面
- `account.html`: 订单预览图片、设计预览图片
- **规格**: 60x60px, 120x120px

#### 管理后台
- 产品列表缩略图（48x48px）
- 设计审核预览图
- 用户头像等

---

## 📦 文件结构

```
assets/
├── hero/
│   ├── hero-card-tee.jpg      [需要]
│   ├── hero-card-bottle.jpg   [需要]
│   ├── hero-card-hat.jpg      [需要]
│   └── hero-card-bag.jpg      [需要]
├── brands/
│   ├── new-era.svg            [需要]
│   ├── champion.svg           [需要]
│   ├── adidas.svg             [需要]
│   ├── columbia.svg           [需要]
│   └── hydro-flask.svg        [需要]
└── products/
    ├── prod-001.jpg           [需要]
    ├── prod-002.jpg           [需要]
    ├── prod-003.jpg           [需要]
    ├── prod-004.jpg           [需要]
    ├── prod-005.jpg           [需要]
    ├── prod-006.jpg           [需要]
    ├── hoodie-front.jpg       [需要]
    ├── hoodie-back.jpg        [需要]
    └── hoodie-detail.jpg      [需要]
```

---

## 🔗 图片来源建议

### 免费图片库
- **Unsplash**: https://unsplash.com/s/photos/t-shirt
- **Pexels**: https://pexels.com/search/t-shirt/
- **Pixabay**: https://pixabay.com/images/search/t-shirt/

### 搜索关键词
- Hero卡片: "custom t-shirt", "water bottle", "baseball cap", "tote bag"
- 产品图片: "long sleeve t-shirt", "hoodie", "custom apparel"
- 品牌Logo: 从品牌官网或使用SVG格式

---

## ✅ 完成状态

- [ ] Hero区域图片（4张）
- [ ] 品牌Logo补充（5个）
- [ ] 产品列表图片（6张）
- [ ] 产品详情图片（3张）
- [ ] 其他页面图片

---

**总计需要**: 18张图片 + 5个SVG Logo

