# 上传图片功能测试指南

## 📋 功能检查清单

### ✅ 基础功能检查

- [ ] **文件选择按钮**
  - [ ] 点击 "Upload" 按钮能打开文件选择对话框
  - [ ] 文件选择对话框只显示图片文件
  - [ ] 选择文件后能正确触发上传流程

- [ ] **拖拽上传**
  - [ ] 拖拽图片文件到页面任意位置能触发上传
  - [ ] 拖拽非图片文件显示错误提示
  - [ ] 拖拽多个文件时只处理第一个图片文件

- [ ] **文件验证**
  - [ ] 非图片文件（如 .txt, .pdf）显示错误提示
  - [ ] 超过 20MB 的文件显示错误提示
  - [ ] 支持的图片格式：PNG, JPG, JPEG, GIF, SVG, WEBP

- [ ] **上传流程**
  - [ ] 有 draft 时使用 API 上传
  - [ ] 无 draft 时使用 FileReader 本地处理
  - [ ] 上传过程中显示 loading 状态
  - [ ] 上传成功后图片显示在画布上
  - [ ] 上传成功后关闭上传模态框

- [ ] **画布集成**
  - [ ] 图片自动居中显示
  - [ ] 图片自动缩放以适应画布（最大 60%）
  - [ ] 图片保持原始宽高比
  - [ ] 图片可以被选中和编辑

## 🔍 日志检查点

### 1. 文件选择流程日志

打开浏览器控制台，点击上传按钮后应该看到：

```
[Upload] ========================================
[Upload] ===== UPLOAD SESSION START =====
[Upload] Session ID: upload-1234567890-abc123
[Upload] Timestamp: 2025-01-27T23:20:00.000Z
[Upload] ========================================
[Upload] ✅ File selected: { name, size, type, ... }
[Upload] 📋 Step 1: Validating file type...
[Upload] ✅ Step 1 PASSED: File type is valid
[Upload] 📋 Step 2: Validating file size...
[Upload] ✅ Step 2 PASSED: File size is within limit
```

### 2. 拖拽上传流程日志

拖拽文件到页面时应该看到：

```
[Upload] ===== DRAG ENTER =====
[Upload] ===== FILE DROPPED =====
[Upload] File filtering: { totalFiles, imageFiles, ... }
[Upload] Processing dropped image files: { count, files, ... }
[Upload] Calling handleFileChange with dropped file
```

### 3. API 上传流程日志（有 draft 时）

```
[Upload] 📋 Step 4: Choosing upload method...
[Upload] 📋 Step 4.1: Attempting API upload...
[Upload] 📋 Step 4.1.1: Requesting upload signature...
[Upload] ✅ Step 4.1.1: Upload signature received
[Upload] 📋 Step 4.1.2: Uploading file to storage...
[Upload] ✅ Step 4.1.2: File uploaded to storage
[Upload] 📋 Step 6: Adding image to canvas...
[Upload] ✅ Step 6.1: Fabric.js loaded successfully
[Upload] ✅ Step 6.2: Image loaded successfully
[Upload] ✅ Step 6.3: Image added to canvas successfully
[Upload] ===== UPLOAD SESSION SUCCESS (API) =====
```

### 4. FileReader 上传流程日志（无 draft 时）

```
[Upload] 📋 Step 5: Using FileReader fallback...
[Upload] 📋 Step 5.1: FileReader started reading file...
[Upload] 📋 Step 5.1: FileReader progress { loaded, total, percent }
[Upload] ✅ Step 5.1: FileReader loaded successfully
[Upload] 📋 Step 5.2: Adding image to canvas from FileReader data...
[Upload] ===== UPLOAD SESSION SUCCESS (FILEREADER) =====
```

### 5. 错误日志

#### 文件类型错误
```
[Upload] ❌ Step 1 FAILED: Invalid file type
[Upload] ===== UPLOAD SESSION END (VALIDATION FAILED) =====
```

#### 文件大小错误
```
[Upload] ❌ Step 2 FAILED: File too large
[Upload] ===== UPLOAD SESSION END (VALIDATION FAILED) =====
```

#### API 上传错误
```
[Upload] ⚠️ Step 4.1 FAILED: API upload failed, falling back to FileReader
```

#### 画布错误
```
[Upload] ❌ Step 6.2 FAILED: Failed to create image object from URL
[Upload] ===== UPLOAD SESSION END (CANVAS ERROR) =====
```

## 🧪 测试用例

### 测试用例 1: 正常上传（小图片）
1. 准备一个小于 1MB 的 PNG 图片
2. 点击 "Upload" 按钮
3. 选择图片文件
4. **预期结果：**
   - 控制台显示完整的成功日志
   - 图片显示在画布中央
   - 上传模态框自动关闭

### 测试用例 2: 正常上传（大图片）
1. 准备一个 5-10MB 的 JPG 图片
2. 点击 "Upload" 按钮
3. 选择图片文件
4. **预期结果：**
   - 控制台显示上传进度日志
   - 图片成功上传并显示在画布上

### 测试用例 3: 拖拽上传
1. 准备一个图片文件
2. 从文件管理器拖拽到浏览器页面
3. **预期结果：**
   - 页面显示拖拽提示（蓝色半透明背景）
   - 控制台显示拖拽相关日志
   - 图片成功上传

### 测试用例 4: 文件类型验证
1. 准备一个 .txt 文件
2. 尝试上传
3. **预期结果：**
   - 显示错误提示："请选择图片文件（PNG、JPG、GIF、SVG等）"
   - 控制台显示验证失败日志

### 测试用例 5: 文件大小验证
1. 准备一个超过 20MB 的图片
2. 尝试上传
3. **预期结果：**
   - 显示错误提示："文件大小超过限制（最大 20MB）"
   - 控制台显示文件大小验证失败日志

### 测试用例 6: 多文件拖拽
1. 拖拽多个文件（包含图片和非图片）
2. **预期结果：**
   - 只处理第一个图片文件
   - 控制台显示文件过滤日志

### 测试用例 7: API 上传失败回退
1. 断开网络连接
2. 尝试上传（有 draft 时）
3. **预期结果：**
   - 控制台显示 API 上传失败日志
   - 自动回退到 FileReader
   - 图片仍然能成功上传

## 🐛 常见问题排查

### 问题 1: 点击上传按钮没有反应
**检查：**
- 控制台是否有错误日志
- `fileInputRef` 是否正确绑定
- 是否有 JavaScript 错误阻止执行

**日志检查：**
```
[Upload] ===== UPLOAD SESSION START =====
```
如果没有这个日志，说明 `handleFileChange` 没有被调用。

### 问题 2: 文件选择后没有上传
**检查：**
- 控制台是否有文件选择日志
- 是否有验证失败的日志
- `setUploading(true)` 是否被调用

**日志检查：**
```
[Upload] ✅ File selected: { ... }
[Upload] 📋 Step 1: Validating file type...
```

### 问题 3: 图片没有显示在画布上
**检查：**
- 控制台是否有画布相关日志
- Fabric.js 是否正确加载
- 图片 URL 是否有效

**日志检查：**
```
[Upload] ✅ Step 6.1: Fabric.js loaded successfully
[Upload] ✅ Step 6.2: Image loaded successfully
[Upload] ✅ Step 6.3: Image added to canvas successfully
```

### 问题 4: 拖拽上传不工作
**检查：**
- 拖拽区域是否正确设置
- 是否有拖拽事件日志
- `onDrop` 事件是否被触发

**日志检查：**
```
[Upload] ===== DRAG ENTER =====
[Upload] ===== FILE DROPPED =====
```

## 📊 性能指标

### 正常上传时间
- 小文件（< 1MB）：< 1 秒
- 中等文件（1-5MB）：1-3 秒
- 大文件（5-20MB）：3-10 秒

### 日志输出时间
- 每个步骤的日志应该在 10ms 内输出
- 如果日志延迟，可能是性能问题

## 🔧 调试技巧

1. **使用 Session ID 追踪**
   - 每个上传会话都有唯一的 Session ID
   - 可以用 Session ID 过滤日志

2. **检查时间戳**
   - 每个日志都有时间戳
   - 可以计算每个步骤的耗时

3. **使用浏览器 Network 面板**
   - 检查 API 请求是否发送
   - 检查响应状态码和内容

4. **使用浏览器 Console 过滤**
   - 使用 `[Upload]` 过滤上传相关日志
   - 使用 `❌` 或 `⚠️` 快速找到错误

## ✅ 功能完成标准

功能被认为已完成当且仅当：

1. ✅ 所有测试用例都通过
2. ✅ 所有日志都正确输出
3. ✅ 没有控制台错误
4. ✅ 图片能正确显示在画布上
5. ✅ 用户体验流畅（有 loading 状态，错误提示清晰）

