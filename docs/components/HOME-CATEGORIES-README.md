# Home Components Documentation

## DatabaseCategoriesSection Component

### 描述
这是一个数据库驱动的分类展示组件，从后端API获取分类数据并动态映射到本地图片资源。这是首页的主要分类展示组件，与后端的categories管理完全集成。

### 功能特性
- ✅ 从数据库动态获取分类数据
- ✅ 智能图片路径映射
- ✅ 响应式网格布局（桌面4列 → 平板3列 → 手机2列 → 小屏1列）
- ✅ 悬停动画效果（上移、阴影、图片缩放）
- ✅ 渐进式加载动画
- ✅ 图片加载失败处理
- ✅ 无障碍访问支持（ARIA 标签）
- ✅ SEO 优化的语义化 HTML 结构
- ✅ 与后台管理系统完全集成

### 数据流程
1. **API 调用**: 使用 `useSWR` 从 `/api/categories` 获取分类数据
2. **图片映射**: 优先使用数据库中的 `imageUrl`，否则根据 slug 或名称智能匹配
3. **描述处理**: 优先使用数据库中的 `description`，否则使用默认描述
4. **错误处理**: 图片加载失败时使用默认图片，API 失败时显示错误信息

### 样式特点
- **卡片设计**: 圆角边框、阴影效果、悬停状态变化
- **图片展示**: 1:1 正方形比例，覆盖模式显示
- **文字排版**: 分类名称和描述的层次结构
- **交互反馈**: 悬停时的缩放、阴影和边框颜色变化

### 使用方法

```tsx
import { DatabaseCategoriesSection } from '@/components/home/DatabaseCategoriesSection';

export function YourPage() {
  return (
    <div>
      <DatabaseCategoriesSection />
    </div>
  );
}
```

### 分类数据结构

数据库中的分类包含以下字段：
```typescript
interface Category {
  id: string;           // 唯一标识符
  name: string;         // 分类显示名称
  slug: string;         // URL 路径标识
  description: string | null;    // 分类描述（可选）
  imageUrl: string | null;       // 图片路径（可选）
  sortOrder: number;    // 排序顺序
}
```

### 图片映射策略

#### 优先级顺序
1. **数据库 imageUrl**: 如果数据库中有设置，直接使用
2. **Slug 匹配**: 根据 category.slug 精确匹配
3. **名称匹配**: 根据 category.name 部分匹配
4. **默认图片**: 使用 T恤图片作为备用

#### 映射关系
```typescript
const slugToImageMap = {
  't-shirts': '/assets/categories/cat-tshirt.png',
  'sweatshirts': '/assets/categories/cat-sweatshirt.png',
  'hats': '/assets/categories/cat-hat.png',
  'caps': '/assets/categories/cat-hat.png',
  'mugs': '/assets/categories/cat-drinkware.png',
  'drinkware': '/assets/categories/cat-drinkware.png',
  'activewear': '/assets/categories/cat-activewear.png',
  'jackets': '/assets/categories/cat-jacket-vest.png',
  'jacket-vest': '/assets/categories/cat-jacket-vest.png',
  'vests': '/assets/categories/cat-jacket-vest.png',
  'polo': '/assets/categories/cat-polo-business.png',
  'polo-business': '/assets/categories/cat-polo-business.png',
  'business': '/assets/categories/cat-polo-business.png',
  'trade-show': '/assets/categories/cat-trade-show.png',
  'tradeshow': '/assets/categories/cat-trade-show.png',
  'workwear': '/assets/categories/cat-workwear.png',
  'uniforms': '/assets/categories/cat-workwear.png'
};
```

### 图片资源位置

分类图片存储在：`/public/assets/categories/`

#### 可用分类图片：
- `cat-tshirt.png` - T恤
- `cat-sweatshirt.png` - 卫衣
- `cat-hat.png` - 帽子
- `cat-bag.png` - 包袋
- `cat-drinkware.png` - 饮具
- `cat-tech.png` - 数码配件
- `cat-office.png` - 办公用品
- `cat-activewear.png` - 运动服装
- `cat-jacket-vest.png` - 夹克马甲
- `cat-polo-business.png` - POLO衫商务装
- `cat-trade-show.png` - 展会用品
- `cat-workwear.png` - 工作服

### 响应式断点

- **桌面 (>1200px)**: 4列网格
- **平板 (900px-1200px)**: 3列网格
- **手机 (600px-900px)**: 2列网格
- **小屏 (<600px)**: 1列网格

### 部署和运维

#### GitHub 提交
- 图片文件已包含在 git 仓库中
- 路径使用相对路径，确保跨环境兼容
- 文件大小已优化，适合静态托管

#### Netlify 部署
- 图片通过静态资源服务，无需额外配置
- 路径使用 `/assets/categories/` 开头，确保正确解析
- 支持图片缓存和 CDN 优化

#### GCP 部署
- 与 Netlify 路径保持一致
- 支持静态资源 CDN 加速
- 兼容容器化部署

### 管理后台集成

分类可以通过后台管理系统进行管理：

1. **添加分类**: 在 Admin → Categories 中添加新分类
2. **设置图片**: 上传图片或设置 imageUrl 路径
3. **排序调整**: 使用 sortOrder 字段控制显示顺序
4. **状态管理**: 使用 isActive 字段控制是否显示

### 自定义和扩展

#### 添加新分类
1. 将图片文件放置到 `/public/assets/categories/` 目录
2. 在后台管理中添加新分类记录
3. 确保 slug 值与图片文件名匹配

#### 修改样式
编辑 `StaticCategoriesSection.module.css` 文件：

```css
/* 修改主色调 */
.btn--primary {
  background: your-custom-color;
}

/* 修改卡片间距 */
.staticCategories__grid {
  gap: your-custom-gap;
}

/* 修改悬停效果 */
.category-card:hover {
  transform: your-custom-transform;
}
```

#### 自定义图片映射
修改组件中的 `getCategoryImagePath` 函数来支持新的分类映射。

### 性能优化

- **图片优化**: 使用 Next.js Image 组件进行懒加载和格式优化
- **CSS 动画**: 使用 transform 和 opacity 属性避免重排
- **模块化 CSS**: 避免样式冲突和全局污染
- **API 缓存**: 使用 SWR 进行数据缓存和重复请求去重

### 故障排除

#### 图片不显示
1. 检查图片文件是否存在 `/public/assets/categories/` 目录
2. 确认文件名格式为 `cat-{slug}.png`
3. 验证 slug 或名称映射是否正确

#### 数据加载失败
1. 检查后端 API `/api/categories` 是否正常响应
2. 确认数据库连接正常
3. 查看浏览器控制台的错误信息

#### 样式问题
1. 确认 CSS 模块文件正确导入
2. 检查 Tailwind CSS 配置是否包含相关类
3. 验证响应式断点是否生效

---

**更新时间**: 2025-11-19  
**版本**: v1.0  
**维护者**: 前端开发团队