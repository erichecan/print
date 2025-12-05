# 字体数据库管理系统设置指南

**更新时间**: 2025-01-30 19:00:00

## 概述

字体管理系统已升级为数据库管理，支持通过后台管理界面管理大量字体。

## 数据库设置

### 1. 运行数据库迁移

```bash
# 进入后端目录
cd backend

# 运行迁移（创建 fonts 表）
npx sequelize-cli db:migrate

# 或者使用 npm script
npm run migrate
```

### 2. 初始化字体数据

运行种子脚本将默认字体导入数据库：

```bash
# 进入后端目录
cd backend

# 运行种子脚本
node src/scripts/seed-fonts.js

# 或者使用 npm script（如果已配置）
npm run seed:fonts
```

这将导入 45+ 个默认字体，包括：
- 25 个拉丁字体（系统字体 + Google Fonts）
- 8 个中文字体（简体 + 繁体）
- 5 个日文字体
- 3 个 Hindi 字体

## 后台管理界面

### 访问路径

访问 `/admin/fonts` 页面进行字体管理。

### 功能

1. **字体列表**
   - 显示所有字体（包括未启用的）
   - 支持按分类、来源、状态筛选
   - 分页显示

2. **添加字体**
   - 点击 "Add Font" 按钮
   - 填写字体信息：
     - Name（必填）：字体名称，必须唯一
     - Display Name（可选）：显示名称
     - Preview Text：预览文本（默认 "Aa"）
     - Category（必填）：字体分类
     - Source（必填）：字体来源（system/google/custom）
     - Google Font Family：如果是 Google Fonts，填写字体家族名称
     - Weights：字体粗细，逗号分隔（如 "400, 500, 700"）
     - Sort Order：排序顺序
     - Active：是否启用

3. **编辑字体**
   - 点击字体行的 "Edit" 按钮
   - 修改字体信息
   - 保存更改

4. **删除字体**
   - 点击字体行的 "Delete" 按钮
   - 确认删除

5. **启用/禁用字体**
   - 点击状态按钮切换字体启用状态
   - 禁用的字体不会在前端显示

## API 端点

### 公共 API

- `GET /api/fonts` - 获取所有启用的字体（按分类分组）
- `GET /api/fonts/category/:category` - 按分类获取字体

### 管理 API（需要管理员权限）

- `GET /api/admin/fonts` - 获取所有字体（包括未启用的）
- `GET /api/admin/fonts/:id` - 获取单个字体
- `POST /api/admin/fonts` - 创建字体
- `PUT /api/admin/fonts/:id` - 更新字体
- `DELETE /api/admin/fonts/:id` - 删除字体

## 前端集成

### Design Lab 字体加载

`EditTextPanel` 组件现在从 API 加载字体：

```typescript
// 自动从 /api/fonts 加载字体
const response = await fontsApi.getAll();
// 如果 API 失败，会回退到配置文件中的字体
```

### 添加 Google Fonts 字体

1. **在后台管理界面添加字体**：
   - Name: `Poppins`
   - Category: `latin`
   - Source: `google`
   - Google Font Family: `Poppins`
   - Weights: `400, 600, 700`

2. **在 `layout.tsx` 中加载字体**（如果还没加载）：
```typescript
import { Poppins } from 'next/font/google';
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});
```

## 数据库模型

### Font 表结构

```sql
CREATE TABLE fonts (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  preview_text VARCHAR(50) NOT NULL DEFAULT 'Aa',
  category ENUM('latin', 'chinese', 'japanese', 'hindi', 'arabic', 'korean', 'thai') NOT NULL,
  source ENUM('system', 'google', 'custom') NOT NULL,
  google_font_family VARCHAR(255),
  weights JSON,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 最佳实践

1. **字体命名**：使用标准字体名称，确保跨平台一致性
2. **预览文本**：使用对应语言的代表性字符
3. **排序顺序**：常用字体使用较小的 sortOrder 值
4. **Google Fonts**：确保在 `layout.tsx` 中加载对应的 Google Fonts
5. **系统字体**：系统字体不需要额外加载，但可能在不同操作系统上显示不同

## 迁移说明

### 从配置文件迁移到数据库

1. 运行数据库迁移创建 `fonts` 表
2. 运行种子脚本导入默认字体
3. 前端代码已自动更新为从 API 加载字体
4. 配置文件 `fonts.ts` 保留作为后备方案（API 失败时使用）

## 故障排除

### 字体不显示

1. 检查字体是否在数据库中且 `is_active = true`
2. 检查 API 是否正常工作：访问 `/api/fonts`
3. 如果是 Google Fonts，检查是否在 `layout.tsx` 中加载
4. 查看浏览器控制台是否有错误

### API 错误

1. 检查数据库连接
2. 检查 `fonts` 表是否存在
3. 检查 Sequelize 模型是否正确注册
4. 查看后端日志

## 下一步

- [ ] 添加字体搜索功能
- [ ] 支持批量导入字体
- [ ] 添加字体预览图片
- [ ] 支持字体分组和标签
- [ ] 添加字体使用统计

