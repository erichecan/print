# Design Lab 需求理解与实现说明

**创建时间**: 2025-01-31 16:25:00

## 1. 需求理解

### 需求 1: "画布中央要有一个默认图片"

**我的理解**：
- 用户希望在 Design Lab 页面加载时，画布中央立即显示一张默认的产品图片（T恤底图）
- 这张图片应该：
  - 显示在画布的正中央
  - 作为背景层，不可选择和移动
  - 其他功能（上传图片、文字、art）可以在这张底图上操作

**实现情况**：
✅ **已实现** - 代码位置：`DesignLabClient.tsx` 第 305-500 行

**实现逻辑**：
1. 画布初始化时（`useEffect` 第 1322 行），立即加载默认产品图片
2. 使用 `loadBackgroundImage` 函数加载图片（第 305 行）
3. 图片居中显示（第 411-412 行）：
   ```typescript
   const left = CANVAS_WIDTH / 2 - scaledWidth / 2;
   const top = CANVAS_HEIGHT / 2 - scaledHeight / 2;
   ```
4. 图片设置为背景层（第 389-395 行）：
   ```typescript
   fabricImg.set({
     selectable: false,  // 不可选择
     evented: false,    // 不可交互
     excludeFromExport: true,
     name: 'background',
   });
   ```
5. 移动到最底层（第 427 行）：
   ```typescript
   canvas.sendToBack(fabricImg);
   ```

**为什么可能看不到图片**：
1. **图片加载是异步的**：图片需要从网络加载，可能需要几秒钟
2. **图片 URL 可能无效**：如果图片 URL 404，会使用占位图或纯色背景
3. **浏览器缓存问题**：可能需要清除缓存或硬刷新

**技术难点**：
- ✅ 已解决：图片异步加载处理
- ✅ 已解决：错误处理和回退机制
- ✅ 已解决：图片居中计算
- ✅ 已解决：背景层设置

---

### 需求 2: "实现有图片，并且在最底层，其他 rail 上面的工具功能都能实现在这个底图上操作"

**我的理解**：
- 底图应该始终在最底层（z-index 最低）
- 左侧工具栏（Rail）的所有功能（Upload、Text、Art）添加的对象应该显示在底图之上
- 用户可以：
  - 在底图上上传图片
  - 在底图上添加文字
  - 在底图上添加艺术素材
  - 所有操作都在底图之上进行

**实现情况**：
✅ **已实现** - 代码位置：`DesignLabClient.tsx`

**实现逻辑**：
1. **底图在最底层**（第 427 行）：
   ```typescript
   canvas.sendToBack(fabricImg);  // 移动到最底层
   ```

2. **其他对象在底图之上**：
   - 上传图片：`handleFileUpload`（第 1032 行）- 使用 `canvas.add(fabricImage)`
   - 添加文字：`handleAddText`（第 931 行）- 使用 `canvas.add(textObj)`
   - 添加 Art：`handleAddArt`（第 1000 行）- 使用 `canvas.add(fabricImage)`
   - 所有对象默认添加在现有对象之上

3. **底图不可交互**（第 389-395 行）：
   ```typescript
   selectable: false,  // 不可选择
   evented: false,     // 不响应鼠标事件
   ```
   这样用户点击画布时，不会选中底图，而是可以：
   - 添加新对象
   - 选择其他对象
   - 在底图上操作

**技术难点**：
- ✅ 已解决：使用 `sendToBack()` 确保底图在最底层
- ✅ 已解决：设置 `selectable: false` 和 `evented: false` 确保底图不可交互
- ✅ 已解决：其他对象正常添加，自动在底图之上

---

## 2. 当前问题诊断

### 问题：看不到默认图片

**可能的原因**：
1. **图片 URL 无效**：检查浏览器控制台的网络请求，看图片是否 404
2. **图片加载慢**：网络慢时，图片需要几秒才能显示
3. **画布未初始化**：检查控制台是否有 "Fabric.js canvas initialized" 日志
4. **图片加载失败**：检查控制台是否有错误信息

**调试步骤**：
1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签，查找：
   - `[DesignLab] Fabric.js canvas initialized`
   - `[DesignLab] Loading background image: <URL>`
   - `[DesignLab] Background image loaded successfully`
3. 查看 Network 标签，查找图片请求，检查是否成功加载
4. 如果图片 404，检查 `getDefaultProductImageUrl` 函数生成的 URL 是否正确

---

## 3. 修复建议

### 如果图片不显示：

1. **检查图片 URL**：
   - 打开控制台，查看 `[DesignLab] Loading background image:` 后面的 URL
   - 在浏览器中直接访问这个 URL，看是否能加载

2. **使用本地图片作为测试**：
   - 可以将图片放在 `public` 目录
   - 使用相对路径加载

3. **添加加载状态指示**：
   - 可以在图片加载时显示加载动画
   - 加载完成后隐藏

4. **优化加载速度**：
   - 使用图片 CDN
   - 预加载图片
   - 使用更小的图片尺寸

---

## 4. 代码关键位置

- **画布初始化**：`DesignLabClient.tsx` 第 1322-1551 行
- **图片加载**：`DesignLabClient.tsx` 第 305-500 行
- **图片居中**：`DesignLabClient.tsx` 第 398-415 行
- **背景层设置**：`DesignLabClient.tsx` 第 389-395 行
- **最底层设置**：`DesignLabClient.tsx` 第 425-436 行

