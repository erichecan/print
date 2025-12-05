# Fabric.js + React 开源示例项目参考

搜索时间：2025-01-31 14:00:00

## 搜索结果

### 1. react-fabric-demo
- **描述**：基于 React（umi）+ Ant Design + Fabric.js 实现的在线图片合成工具
- **功能**：支持背景图、背景色、照片、文字的拖拽生成
- **参考链接**：
  - GitHub: 需要搜索 `react-fabric-demo` 或 `guohao123/react-fabric-demo`
  - 教程：https://blog.csdn.net/m0_69838795/article/details/134117422

### 2. fabric-whiteboard
- **描述**：基于 Node.js 和 React 开发的白板组件
- **功能**：支持自由绘制、文本框、形状创建等功能
- **GitHub**: 需要搜索 `fabric-whiteboard` 或 `wyk978/fabric-whiteboard`

### 3. react-komik
- **描述**：基于 Fabric.js 画布绘制的 ReactJS 漫画条创建器
- **功能**：支持渲染后编辑（定位、缩放、着色）等功能
- **GitHub**: 需要搜索 `react-komik` 或 `komik/react-komik`

### 4. vue-fabric-editor
- **描述**：基于 Fabric.js 和 Vue 的开源图片编辑器（虽然使用 Vue，但可参考实现方式）
- **功能**：支持自定义字体、素材和设计模板
- **参考价值**：Fabric.js 的使用方式可以应用到 React

## 关键实现要点

### 1. Canvas 初始化
```javascript
import { fabric } from 'fabric';

const canvasRef = useRef(null);

useEffect(() => {
  const canvas = new fabric.Canvas(canvasRef.current, {
    width: 800,
    height: 600,
    backgroundColor: 'transparent'
  });
  
  return () => {
    canvas.dispose();
  };
}, []);
```

### 2. 背景图片加载
```javascript
fabric.Image.fromURL(imageUrl, (img) => {
  // 设置图片属性
  img.set({
    left: 0,
    top: 0,
    selectable: false,
    evented: false
  });
  
  // 缩放以适应画布
  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  img.scale(scale);
  
  // 添加到画布并移到最底层
  canvas.add(img);
  canvas.sendToBack(img);
  canvas.renderAll();
});
```

### 3. 错误处理和回退
```javascript
fabric.Image.fromURL(imageUrl, (img) => {
  // 成功加载
  canvas.add(img);
}, {
  crossOrigin: 'anonymous'
});

// 错误处理
img.onerror = () => {
  // 使用占位图片
  const placeholderUrl = '/assets/placeholder.jpg';
  fabric.Image.fromURL(placeholderUrl, (placeholderImg) => {
    canvas.add(placeholderImg);
  });
};
```

## 下一步行动

1. 修复当前图片加载问题，确保至少显示占位图
2. 参考这些项目的实现方式改进我们的代码
3. 使用更可靠的图片加载策略

