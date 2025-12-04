# 拍照功能恢复报告

**日期**: 2025-12-04  
**状态**: ✅ 已恢复

## 问题分析

用户反馈线下订单的最后一步之前有拍照功能，但现在没有了。经过检查发现：

1. **文档记录**: `docs/TODAY-UPDATES-2025-01-28.md` 中明确记录了移动端拍照支持功能
2. **代码缺失**: 当前代码中缺少以下功能：
   - 移动设备检测
   - `capture="environment"` 属性
   - 移动设备时 `accept` 包含 `image/*`
   - 移动设备提示框
   - 相关翻译

## 恢复的功能

### 1. 移动设备检测
```typescript
const [isMobile, setIsMobile] = useState(false);

// 在 useEffect 中检测
const userAgent = window.navigator.userAgent.toLowerCase();
const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
  (window.innerWidth <= 768);
setIsMobile(isMobileDevice);
```

### 2. 文件输入框优化
```typescript
<input
  type="file"
  accept={isMobile ? `${ACCEPTED_EXTENSIONS.join(',')},image/*` : ACCEPTED_EXTENSIONS.join(',')}
  capture={isMobile ? 'environment' : undefined}
  multiple
  onChange={handleFileInputChange}
  ...
/>
```

### 3. 移动设备提示框
```typescript
{isMobile && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
    <p className="text-sm font-semibold text-blue-900 mb-1">{t('mobileUploadTip')}</p>
    <p className="text-xs text-blue-700">{t('mobileUploadDescription')}</p>
  </div>
)}
```

### 4. 翻译更新
- **英文**:
  - `mobileUploadTip`: "📱 Mobile Device Tip"
  - `mobileUploadDescription`: "You can use the camera to take photos or select files from your gallery."
  - `mobileUploadOrBrowse`: "Take photo or browse"

- **中文**:
  - `mobileUploadTip`: "📱 移动设备提示"
  - `mobileUploadDescription`: "您可以使用相机拍照上传文件，或从相册中选择文件。"
  - `mobileUploadOrBrowse`: "拍照或浏览"

## 功能说明

### 移动设备
- 自动检测移动设备（通过 User Agent 和屏幕宽度）
- 显示移动设备提示框
- 文件输入框支持直接调用相机拍照
- 提示文字显示"拍照或浏览"

### 桌面设备
- 保持原有功能
- 提示文字显示"拖放或浏览"
- 不支持直接拍照（需要先保存到本地）

## 技术细节

### `capture` 属性
- `capture="environment"`: 使用后置相机（移动设备）
- 仅在移动设备上生效
- 桌面浏览器会忽略此属性

### `accept` 属性
- 移动设备: `${ACCEPTED_EXTENSIONS.join(',')},image/*`
- 桌面设备: `ACCEPTED_EXTENSIONS.join(',')`
- `image/*` 允许所有图片格式，包括相机拍摄的照片

## 修改的文件

1. `apps/web/src/app/offline-orders/page.tsx`
   - 添加 `isMobile` 状态
   - 添加移动设备检测逻辑
   - 更新 `renderStep5` 函数，添加移动设备提示和优化文件输入框

2. `apps/web/src/translations/offlineOrders.ts`
   - 添加移动设备相关翻译（中英文）

## 测试建议

1. **移动设备测试**:
   - 在手机/平板上访问订单创建页面
   - 进入最后一步（文件上传）
   - 确认显示移动设备提示框
   - 点击上传区域，确认可以调用相机拍照
   - 确认可以同时选择相册中的文件

2. **桌面设备测试**:
   - 在桌面浏览器上访问
   - 确认不显示移动设备提示框
   - 确认文件上传功能正常
   - 确认提示文字为"拖放或浏览"

## 下一步

1. 提交代码到 GitHub
2. 部署到生产环境
3. 在移动设备上测试验证

