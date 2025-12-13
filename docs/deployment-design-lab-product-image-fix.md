# Design Lab 底图大小与位置修复 - 部署记录

**部署时间**: 2025-12-19 21:20:00

## 部署信息

### Cloud Build 构建
- **构建ID**: `89101cfd-df46-478d-ad94-ac9377b81850`
- **状态**: ✅ SUCCESS
- **持续时间**: 5分11秒
- **构建日志**: https://console.cloud.google.com/cloud-build/builds/89101cfd-df46-478d-ad94-ac9377b81850?project=234065158862

### 部署的服务

#### 前端服务 (print-main-frontend)
- **区域**: us-central1
- **URL**: https://print-main-frontend-234065158862.us-central1.run.app
- **最新版本**: 已更新（包含底图大小与位置修复）

#### 后端服务 (print-main-backend)
- **区域**: us-central1
- **URL**: https://print-main-backend-234065158862.us-central1.run.app
- **最新版本**: 已更新

## 部署内容

### 本次部署包含的改动

1. **Design Lab 底图大小与位置修复**
   - 增大安全区比例：从 65%×75% 改为 80%×90%
   - 改为cover模式：从contain改为cover
   - 修改文件：
     - `apps/web/src/design/utils/fit.ts`
     - `apps/web/src/design/canvas/layers/productImageLayer.ts`
     - `apps/web/src/app/design-lab/DesignLabClient.tsx`

2. **Design Lab Logo和本地保存功能**（之前提交）
   - Logo替换为图片
   - 移除My Designs按钮
   - 实现本地保存功能

### Git 提交
- `fix(design-lab): 修复底图大小与位置 - 增大至80%×90%并使用cover模式`
- `feat(design-lab): Logo使用图片并实现本地保存功能`

## 验证步骤

### 1. 验证前端服务
访问：https://print-main-frontend-234065158862.us-central1.run.app/design-lab

### 2. 验证底图大小与位置
1. 打开Design Lab页面
2. 打开浏览器Console（F12）
3. 执行以下代码检查底图信息：
```javascript
const canvas = window.fabricCanvas || window.DesignLabCanvas?.getCanvas();
const productImage = canvas.getObjects().find(obj => obj.name?.startsWith('product-image-'));
console.log('底图信息:', {
  width: productImage.width * productImage.scaleX,  // 应该 ≈ 800px (1000 * 0.8)
  height: productImage.height * productImage.scaleY, // 应该 ≈ 1080px (1200 * 0.9)
  left: productImage.left,  // 应该 = 500px (1000/2)
  top: productImage.top,    // 应该 = 600px (1200/2)
  originX: productImage.originX, // 应该是 'center'
  originY: productImage.originY  // 应该是 'center'
});
```

### 3. 视觉验证
- ✅ 底图应该更大，占据画布主要区域（80%×90%）
- ✅ 底图应该严格居中
- ✅ 底图应该在所有其他图层之下

## 部署状态

- ✅ 构建成功
- ✅ 镜像已推送到 Artifact Registry
- ✅ 前端服务已部署
- ✅ 后端服务已部署
- ⏳ 等待线上验证
