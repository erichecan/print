# Design Lab 5.0 - 功能 1: 视图切换功能

**创建时间**: 2025-12-20 03:00:00  
**状态**: ✅ 已完成  
**优先级**: 1

---

## 一、功能描述

实现视图切换功能，用户点击 Sidebar 中的 Front/Back/Sleeve Design 按钮时，Canvas 中的商品图片会切换显示对应的视图。

---

## 二、实现内容

### 2.1 已存在的代码

- ✅ `currentView` state（'front' | 'back' | 'sleeve'）
- ✅ `handleViewChange` 函数
- ✅ Sidebar 按钮已绑定 `onClick={() => handleViewChange('front/back/sleeve')}`
- ✅ Canvas 图片 URL 已根据 `currentView` 动态获取

### 2.2 添加的功能

1. **调试日志**
   - 视图切换时输出日志：从哪个视图切换到哪个视图
   - 图片 URL 获取时输出日志：当前视图和图片 URL

2. **视图变化监听**
   - 使用 `useEffect` 监听 `currentView` 变化
   - 验证图片 URL 是否正确获取

---

## 三、技术实现

### 3.1 状态管理

```typescript
const [currentView, setCurrentView] = useState<'front' | 'back' | 'sleeve'>('front');
```

### 3.2 视图切换处理

```typescript
const handleViewChange = (view: 'front' | 'back' | 'sleeve') => {
  console.log('[DesignLab 5.0] 视图切换:', { from: currentView, to: view });
  setCurrentView(view);
};
```

### 3.3 图片 URL 获取

```typescript
const getCurrentImageUrl = () => {
  const url = productInfo.baseImages[currentView];
  console.log('[DesignLab 5.0] 获取图片 URL:', { currentView, url });
  return url;
};
```

### 3.4 视图变化监听

```typescript
useEffect(() => {
  const imageUrl = getCurrentImageUrl();
  console.log('[DesignLab 5.0] 视图已切换:', { 
    currentView, 
    imageUrl,
    hasImage: !!imageUrl 
  });
}, [currentView]);
```

---

## 四、测试验证

### 4.1 功能测试

1. **点击 Front 按钮**
   - ✅ 按钮变为激活状态（`is-active` class）
   - ✅ Canvas 显示 Front 视图图片
   - ✅ 控制台输出切换日志

2. **点击 Back 按钮**
   - ✅ 按钮变为激活状态
   - ✅ Canvas 显示 Back 视图图片
   - ✅ Front 按钮取消激活状态

3. **点击 Sleeve Design 按钮**
   - ✅ 按钮变为激活状态
   - ✅ Canvas 显示 Sleeve 视图图片
   - ✅ 其他按钮取消激活状态

### 4.2 调试日志

打开浏览器控制台（F12），应该能看到：
```
[DesignLab 5.0] 视图切换: { from: 'front', to: 'back' }
[DesignLab 5.0] 获取图片 URL: { currentView: 'back', url: '...' }
[DesignLab 5.0] 视图已切换: { currentView: 'back', imageUrl: '...', hasImage: true }
```

---

## 五、后续优化

- [ ] 添加图片切换过渡动画
- [ ] 添加图片加载状态指示
- [ ] 处理图片加载失败的情况
- [ ] 支持键盘快捷键切换视图

---

**下一步**: 功能 2 - 商品图片动态加载（根据 URL 参数 productId/colorId）
