# Assets Folder Structure

这个文件夹包含网站所需的所有图片资源。

## 目录说明

### `logo.svg`
- **位置**: 根目录
- **尺寸**: 建议 200x60px
- **用途**: 网站主 logo

### `hero/` - Hero 区域图片
- `hero-products.jpg` - 主产品展示 (800x500)
- `hero-bottles.jpg` - 水杯产品 (800x500)
- `hero-hats.jpg` - 帽子产品 (800x500)

### `categories/` - 产品分类图标
- `cat-tshirt.png` - T恤 (200x200)
- `cat-sweatshirt.png` - 卫衣 (200x200)
- `cat-hat.png` - 帽子 (200x200)
- `cat-bag.png` - 包袋 (200x200)
- `cat-drinkware.png` - 饮具 (200x200)
- `cat-office.png` - 办公用品 (200x200)
- `cat-tech.png` - 科技产品 (200x200)
- `cat-workwear.png` - 工作服 (200x200)

### `brands/` - 品牌 Logo
- `nike.svg` - Nike (100x40)
- `carhartt.svg` - Carhartt (100x40)
- `northface.svg` - The North Face (120x40)
- `stanley.svg` - Stanley (80x40)
- `patagonia.svg` - Patagonia (100x40)

### `avatars/` - 用户头像
- `mary.jpg` - Mary B. (60x60 圆形)
- `ingrid.jpg` - Ingrid D. (60x60 圆形)
- `david.jpg` - David P. (60x60 圆形)

### 其他图片
- `enterprise.jpg` - 企业服务展示 (600x400)

## 占位符说明

目前所有图片都是 SVG 占位符。你可以：
1. 将同名图片替换到对应文件夹
2. 文件名和路径保持完全一致
3. 建议尺寸已标注，可按需调整
4. 网站会自动加载新图片（无需修改 HTML）

## 图片优化建议

- **Hero 图片**: 使用 WebP 格式，压缩到 80% 质量
- **分类图标**: SVG 最佳，PNG 备选，文件 < 50KB
- **品牌 Logo**: SVG 格式，保持矢量质量
- **头像**: JPG 格式，圆形裁剪
- **企业服务**: JPG 格式，建议 1200x800 用于高清显示

