'use client';

/**
 * Design Lab Client
 * [2025-11-11 15:54:12] Fabric.js + Zustand 前端编辑器骨架，实现桌面编辑与移动端快速编辑
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { authApi, designLabApi, templateApi, designCommentApi, type DesignDraft, type DesignCanvasSnapshot, type DesignTemplate, type DesignComment } from '@/lib/api';
import { useDesignLabStore, type LayerInfo } from '@/contexts/designLabStore';

type ToolKey = 'upload' | 'text' | 'art' | 'templates' | 'products' | 'colors' | 'names' | 'printArea' | 'comments';

const AUTO_SAVE_DELAY = 1200;

const DesignLabClient = () => {
  const router = useRouter();
  const params = useSearchParams();
  const designIdParam = params?.get('designId');
  const variantIdParam = params?.get('variantId');

  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<any>(null);
  const fabricCanvasRef = useRef<any>(null);
  const applyingSnapshotRef = useRef(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialSyncRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { draft, canvas, mode, mobileLocked, layers, currentView, viewCanvases } = useDesignLabStore((state) => ({
    draft: state.draft,
    canvas: state.canvas,
    mode: state.mode,
    mobileLocked: state.mobileLocked,
    layers: state.layers,
    currentView: state.currentView, // [2025-01-27 21:00:00] 当前视图
    viewCanvases: state.viewCanvases, // [2025-01-27 21:00:00] 多视图画布
  }));
  const setDraft = useDesignLabStore((state) => state.setDraft);
  const patchDraft = useDesignLabStore((state) => state.patchDraft);
  const setCanvas = useDesignLabStore((state) => state.setCanvas);
  const setView = useDesignLabStore((state) => state.setView); // [2025-01-27 21:00:00] 切换视图
  const undo = useDesignLabStore((state) => state.undo);
  const redo = useDesignLabStore((state) => state.redo);
  const setMode = useDesignLabStore((state) => state.setMode);
  const setMobileLocked = useDesignLabStore((state) => state.setMobileLocked);
  const updateLayers = useDesignLabStore((state) => state.updateLayers);
  const toggleLayerVisibility = useDesignLabStore((state) => state.toggleLayerVisibility);
  const toggleLayerLock = useDesignLabStore((state) => state.toggleLayerLock);
  const bringToFront = useDesignLabStore((state) => state.bringToFront);
  const sendToBack = useDesignLabStore((state) => state.sendToBack);
  const moveLayer = useDesignLabStore((state) => state.moveLayer);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<{ unitPrice: number; quantity: number; total: number; currency: string } | null>(null);
  const [quantity, setQuantity] = useState(12);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeObjectId, setActiveObjectId] = useState<string | null>(null);
  const [designName, setDesignName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedTextObject, setSelectedTextObject] = useState<any>(null);
  const [showPrintArea, setShowPrintArea] = useState(true);
  // [2025-11-15 16:05:30] 5 区域布局新增：选中工具、指南面板、产品色和视图缩略图状态
  const [selectedTool, setSelectedTool] = useState<ToolKey>('upload');
  const [guideCollapsed, setGuideCollapsed] = useState(false);
  const [hasArtwork, setHasArtwork] = useState(false);
  const [selectedProductColor, setSelectedProductColor] = useState('navy');
  
  // [2025-01-27 21:05:00] 批量命名功能状态
  const [showBatchNames, setShowBatchNames] = useState(false);
  const [batchNames, setBatchNames] = useState('');
  const [exporting, setExporting] = useState(false);
  
  // [2025-01-27 21:05:00] 设计模板库状态
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<string | null>(null);
  
  // [2025-01-27 21:55:00] 设计评论状态
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<DesignComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // [2025-11-15 16:06:02] 视图缩略图、产品配色、预设素材与推荐产品数据
  const viewOptions = useMemo(
    () => [
      { key: 'front' as const, label: '正面', thumbnail: '/assets/hero/hero-card-tee.jpg' },
      { key: 'back' as const, label: '背面', thumbnail: '/assets/hero/hero-card-bag.jpg' },
      { key: 'sleeve' as const, label: '袖口', thumbnail: '/assets/hero/hero-card-hat.jpg' },
      { key: 'zoom' as const, label: '细节', thumbnail: '/assets/hero/hero-card-bottle.jpg' },
    ],
    []
  );

  const productColors = useMemo(
    () => [
      { key: 'navy', label: '海军蓝', swatch: '#0f172a' },
      { key: 'black', label: '黑色', swatch: '#111827' },
      { key: 'heather', label: 'Heather', swatch: '#94a3b8' },
      { key: 'sunset', label: '暮光橙', swatch: '#f97316' },
      { key: 'forest', label: '森林绿', swatch: '#065f46' },
    ],
    []
  );

  const artPresets = useMemo(
    () => [
      {
        id: 'badge',
        label: 'Heritage Badge',
        type: 'image' as const,
        src: '/assets/hero/hero-hats.jpg',
      },
      {
        id: 'sunburst',
        label: 'Sunburst',
        type: 'shape' as const,
        shape: 'star',
        fill: '#facc15',
      },
      {
        id: 'stripe',
        label: 'Stripes',
        type: 'shape' as const,
        shape: 'rect',
        fill: '#38bdf8',
      },
      {
        id: 'badge-2',
        label: 'Monogram',
        type: 'text' as const,
        text: 'SP',
      },
    ],
    []
  );

  const recommendations = useMemo(
    () => [
      {
        id: 'rec-hoodie',
        title: 'Gildan Midweight Hoodie',
        description: '经典 50/50 抓绒，适合团建发放。',
        image: '/assets/cat-sweatshirt.webp',
      },
      {
        id: 'rec-tee',
        title: 'Softstyle Jersey Tee',
        description: '最低 MOQ 12 件，支持混色。',
        image: '/assets/cat-tshirt.webp',
      },
      {
        id: 'rec-hat',
        title: 'Structured Trucker Hat',
        description: '刺绣工艺，提供预设色板。',
        image: '/assets/cat-hat.webp',
      },
      {
        id: 'rec-bottle',
        title: 'Vacuum Bottle',
        description: '双层不锈钢，礼品场景佳选。',
        image: '/assets/cat-drinkware.webp',
      },
    ],
    []
  );

  const guideActions = useMemo(
    () => [
      { key: 'upload' as ToolKey, label: 'Upload', description: '拖拽或选择 AI、PDF、PNG', icon: '⬆️' },
      { key: 'text' as ToolKey, label: 'Add Text', description: '输入标语 / 名称', icon: '🔤' },
      { key: 'art' as ToolKey, label: 'Add Art', description: '使用预设图形或图案', icon: '🎨' },
      { key: 'products' as ToolKey, label: 'Change Product', description: '切换品类或颜色', icon: '🧢' },
    ],
    []
  );
  const printAreaRef = useRef<any>(null);
  const safeAreaRef = useRef<any>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  // [2025-01-27 21:25:00] currentView 现在从 store 获取，不需要本地 state
  // const [currentView, setCurrentView] = useState<'front' | 'back' | 'sleeve' | 'zoom'>('front');

  const ensureFabric = useCallback(async () => {
    if (fabricRef.current) {
      return fabricRef.current;
    }
    const fabricModule = await import('fabric');
    const fabric = fabricModule.default || fabricModule;
    fabricRef.current = fabric;
    return fabric;
  }, []);

  const ensureObjectIds = useCallback(() => {
    const canvasInstance = fabricCanvasRef.current;
    if (!canvasInstance) {
      return;
    }
    canvasInstance.getObjects().forEach((obj: any) => {
      const fabricObject = obj as unknown as { id?: string };
      if (!fabricObject.id) {
        fabricObject.id = uuidv4();
      }
    });
  }, []);

  const applySnapshotToCanvas = useCallback(
    async (snapshot: DesignCanvasSnapshot) => {
      const fabric = await ensureFabric();
      const element = canvasElementRef.current;
      if (!element) {
        return;
      }

      if (!fabricCanvasRef.current) {
        fabricCanvasRef.current = new fabric.Canvas(element, {
          preserveObjectStacking: true,
          selection: true,
        });
      }

      const canvasInstance = fabricCanvasRef.current;

      applyingSnapshotRef.current = true;
      canvasInstance.loadFromJSON(
        snapshot,
        () => {
          ensureObjectIds();
          canvasInstance.renderAll();
          applyingSnapshotRef.current = false;
        },
        (o: any, object: any) => {
          if (object) {
            const castObject = object as unknown as { id?: string };
            if (!castObject.id) {
              castObject.id = uuidv4();
            }
          }
        }
      );

      if (snapshot.size) {
        element.width = snapshot.size.width;
        element.height = snapshot.size.height;
        canvasInstance.setWidth(snapshot.size.width);
        canvasInstance.setHeight(snapshot.size.height);
      }
    },
    [ensureFabric, ensureObjectIds]
  );

  const handleCanvasChange = useCallback(() => {
    if (!fabricCanvasRef.current || applyingSnapshotRef.current) {
      return;
    }
    const snapshot = fabricCanvasRef.current.toJSON(['id']);
    setCanvas(snapshot, { pushHistory: true });
  }, [setCanvas]);

  const handleSelectionChange = useCallback(() => {
      const selected = fabricCanvasRef.current?.getActiveObject() as (Record<string, any> & { id?: string }) | undefined;
    if (selected?.id) {
      setActiveObjectId(selected.id);
      // [2025-01-27 15:50:00] Check if selected object is a text object
      if (selected.type === 'textbox' || selected.type === 'i-text' || selected.type === 'text') {
        setSelectedTextObject(selected);
      } else {
        setSelectedTextObject(null);
      }
    } else {
      setActiveObjectId(null);
      setSelectedTextObject(null);
    }
  }, []);

  // [2025-01-27 15:40:00] Update layers list from canvas objects
  const updateLayersFromCanvas = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const objects = fabricCanvasRef.current.getObjects();
    const layerInfos: LayerInfo[] = objects.map((obj: any, index: number) => {
      const id = obj.id || uuidv4();
      if (!obj.id) obj.id = id;

      let name = '未命名';
      let type: LayerInfo['type'] = 'rect';

      if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
        type = obj.type === 'textbox' ? 'textbox' : obj.type === 'i-text' ? 'i-text' : 'text';
        name = (obj.text || obj.text || '文字').substring(0, 20);
      } else if (obj.type === 'image') {
        type = 'image';
        name = '图片';
      } else {
        type = obj.type as LayerInfo['type'];
        name = obj.type || '对象';
      }

      return {
        id,
        type,
        name,
        visible: obj.visible !== false,
        locked: obj.selectable === false || obj.evented === false,
        zIndex: index,
      };
    });

    // Reverse to show top layer first (like Custom Ink)
    updateLayers(layerInfos.reverse());
  }, [updateLayers]);

  // [2025-01-27 15:40:00] Handle layer selection
  const handleLayerSelect = useCallback(
    (layerId: string) => {
      if (!fabricCanvasRef.current) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === layerId);
      if (obj) {
        fabricCanvasRef.current.setActiveObject(obj);
        fabricCanvasRef.current.renderAll();
        setActiveObjectId(layerId);
      }
    },
    []
  );

  // [2025-01-27 15:40:00] Handle layer visibility toggle
  const handleLayerVisibilityToggle = useCallback(
    (layerId: string) => {
      if (!fabricCanvasRef.current) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === layerId);
      if (obj) {
        obj.visible = !obj.visible;
        fabricCanvasRef.current.renderAll();
        toggleLayerVisibility(layerId);
        handleCanvasChange();
      }
    },
    [toggleLayerVisibility, handleCanvasChange]
  );

  // [2025-01-27 15:40:00] Handle layer lock toggle
  const handleLayerLockToggle = useCallback(
    (layerId: string) => {
      if (!fabricCanvasRef.current) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === layerId);
      if (obj) {
        obj.selectable = obj.selectable === false;
        obj.evented = obj.evented === false;
        if (obj.selectable === false) {
          fabricCanvasRef.current.discardActiveObject();
        }
        fabricCanvasRef.current.renderAll();
        toggleLayerLock(layerId);
        handleCanvasChange();
      }
    },
    [toggleLayerLock, handleCanvasChange]
  );

  // [2025-01-27 15:40:00] Handle bring to front
  const handleBringToFront = useCallback(
    (layerId: string) => {
      if (!fabricCanvasRef.current) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === layerId);
      if (obj) {
        fabricCanvasRef.current.bringToFront(obj);
        fabricCanvasRef.current.renderAll();
        bringToFront(layerId);
        updateLayersFromCanvas();
        handleCanvasChange();
      }
    },
    [bringToFront, updateLayersFromCanvas, handleCanvasChange]
  );

  // [2025-01-27 15:40:00] Handle send to back
  const handleSendToBack = useCallback(
    (layerId: string) => {
      if (!fabricCanvasRef.current) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === layerId);
      if (obj) {
        fabricCanvasRef.current.sendToBack(obj);
        fabricCanvasRef.current.renderAll();
        sendToBack(layerId);
        updateLayersFromCanvas();
        handleCanvasChange();
      }
    },
    [sendToBack, updateLayersFromCanvas, handleCanvasChange]
  );

  // [2025-01-27 15:50:00] Advanced text tools handlers
  const handleTextFontSizeChange = useCallback(
    (fontSize: number) => {
      if (!fabricCanvasRef.current || !selectedTextObject) return;
      selectedTextObject.set('fontSize', fontSize);
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      setSelectedTextObject({ ...selectedTextObject, fontSize });
    },
    [selectedTextObject, handleCanvasChange]
  );

  const handleTextBoldToggle = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedTextObject) return;
    const currentWeight = selectedTextObject.fontWeight || 'normal';
    const newWeight = currentWeight === 'bold' ? 'normal' : 'bold';
    selectedTextObject.set('fontWeight', newWeight);
    fabricCanvasRef.current.renderAll();
    handleCanvasChange();
    setSelectedTextObject({ ...selectedTextObject, fontWeight: newWeight });
  }, [selectedTextObject, handleCanvasChange]);

  const handleTextItalicToggle = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedTextObject) return;
    const currentStyle = selectedTextObject.fontStyle || 'normal';
    const newStyle = currentStyle === 'italic' ? 'normal' : 'italic';
    selectedTextObject.set('fontStyle', newStyle);
    fabricCanvasRef.current.renderAll();
    handleCanvasChange();
    setSelectedTextObject({ ...selectedTextObject, fontStyle: newStyle });
  }, [selectedTextObject, handleCanvasChange]);

  const handleTextUnderlineToggle = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedTextObject) return;
    const currentUnderline = selectedTextObject.underline || false;
    selectedTextObject.set('underline', !currentUnderline);
    fabricCanvasRef.current.renderAll();
    handleCanvasChange();
    setSelectedTextObject({ ...selectedTextObject, underline: !currentUnderline });
  }, [selectedTextObject, handleCanvasChange]);

  const handleTextAlign = useCallback(
    (align: 'left' | 'center' | 'right' | 'justify') => {
      if (!fabricCanvasRef.current || !selectedTextObject) return;
      selectedTextObject.set('textAlign', align);
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      setSelectedTextObject({ ...selectedTextObject, textAlign: align });
    },
    [selectedTextObject, handleCanvasChange]
  );

  const handleTextColorChange = useCallback(
    (color: string) => {
      if (!fabricCanvasRef.current || !selectedTextObject) return;
      selectedTextObject.set('fill', color);
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      setSelectedTextObject({ ...selectedTextObject, fill: color });
    },
    [selectedTextObject, handleCanvasChange]
  );

  // [2025-01-27 16:00:00] Initialize print area visualization
  const initializePrintArea = useCallback(async (fabric: any, canvasInstance: any) => {
    if (!canvasInstance) return;

    const canvasWidth = canvas?.size?.width || 500;
    const canvasHeight = canvas?.size?.height || 600;

    // Print area: 80% of canvas (centered)
    const printAreaWidth = canvasWidth * 0.8;
    const printAreaHeight = canvasHeight * 0.8;
    const printAreaLeft = (canvasWidth - printAreaWidth) / 2;
    const printAreaTop = (canvasHeight - printAreaHeight) / 2;

    // Safe area: 90% of print area (centered within print area)
    const safeAreaWidth = printAreaWidth * 0.9;
    const safeAreaHeight = printAreaHeight * 0.9;
    const safeAreaLeft = printAreaLeft + (printAreaWidth - safeAreaWidth) / 2;
    const safeAreaTop = printAreaTop + (printAreaHeight - safeAreaHeight) / 2;

    // Create print area rectangle (dashed border)
    if (!printAreaRef.current) {
      const printAreaRect = new fabric.Rect({
        left: printAreaLeft,
        top: printAreaTop,
        width: printAreaWidth,
        height: printAreaHeight,
        fill: 'transparent',
        stroke: '#ff1f3d',
        strokeWidth: 2,
        strokeDashArray: [10, 5],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: 'print-area',
      });
      printAreaRef.current = printAreaRect;
      canvasInstance.add(printAreaRect);
      canvasInstance.sendToBack(printAreaRect);
    }

    // Create safe area rectangle (dotted border)
    if (!safeAreaRef.current) {
      const safeAreaRect = new fabric.Rect({
        left: safeAreaLeft,
        top: safeAreaTop,
        width: safeAreaWidth,
        height: safeAreaHeight,
        fill: 'transparent',
        stroke: '#ff1f3d',
        strokeWidth: 1,
        strokeDashArray: [3, 3],
        strokeOpacity: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: 'safe-area',
      });
      safeAreaRef.current = safeAreaRect;
      canvasInstance.add(safeAreaRect);
      canvasInstance.sendToBack(safeAreaRect);
    }

    // Ensure print area indicators are always at the back
    if (printAreaRef.current) {
      canvasInstance.sendToBack(printAreaRef.current);
    }
    if (safeAreaRef.current) {
      canvasInstance.sendToBack(safeAreaRef.current);
    }

    canvasInstance.renderAll();
  }, [canvas]);

  // [2025-01-27 16:00:00] Toggle print area visibility
  const togglePrintArea = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const newVisibility = !showPrintArea;
    setShowPrintArea(newVisibility);

    if (printAreaRef.current) {
      printAreaRef.current.set('visible', newVisibility);
    }
    if (safeAreaRef.current) {
      safeAreaRef.current.set('visible', newVisibility);
    }
    fabricCanvasRef.current.renderAll();
  }, [showPrintArea]);

  // [2025-01-27 16:05:00] Zoom controls
  const handleZoomChange = useCallback(
    (newZoom: number) => {
      if (!fabricCanvasRef.current) return;
      const clampedZoom = Math.max(50, Math.min(400, newZoom));
      setZoomLevel(clampedZoom);

      const canvasInstance = fabricCanvasRef.current;
      const zoom = clampedZoom / 100;
      canvasInstance.setZoom(zoom);

      // Center the canvas after zoom
      const canvasWidth = canvasInstance.getWidth();
      const canvasHeight = canvasInstance.getHeight();
      const vpt = canvasInstance.viewportTransform;
      if (vpt) {
        vpt[4] = (canvasWidth - canvasWidth * zoom) / 2;
        vpt[5] = (canvasHeight - canvasHeight * zoom) / 2;
        canvasInstance.setViewportTransform(vpt);
      }

      canvasInstance.renderAll();
    },
    []
  );

  const handleZoomIn = useCallback(() => {
    handleZoomChange(zoomLevel + 10);
  }, [zoomLevel, handleZoomChange]);

  const handleZoomOut = useCallback(() => {
    handleZoomChange(zoomLevel - 10);
  }, [zoomLevel, handleZoomChange]);

  const handleZoomReset = useCallback(() => {
    handleZoomChange(100);
  }, [handleZoomChange]);

  // [2025-01-27 16:10:00] View switching (front/back/sleeve)
  // [2025-01-27 21:00:00] 实现多视图切换功能
  const handleViewSwitch = useCallback(
    async (view: 'front' | 'back' | 'sleeve' | 'zoom') => {
      if (view === 'zoom') {
        // [2025-01-27 21:25:00] Zoom 视图只是放大当前视图（不切换画布）
        handleZoomChange(150); // 放大到 150%
        return;
      }
      
      // 保存当前画布状态到 store
      if (fabricCanvasRef.current && (currentView === 'front' || currentView === 'back' || currentView === 'sleeve')) {
        const snapshot = fabricCanvasRef.current.toJSON(['id']);
        setCanvas(snapshot, { pushHistory: false });
      }
      
      // 切换视图
      setView(view as 'front' | 'back' | 'sleeve');
      
      // 加载新视图的画布
      const viewCanvas = viewCanvases[view as 'front' | 'back' | 'sleeve'];
      if (viewCanvas) {
        await applySnapshotToCanvas(viewCanvas);
        
        // [2025-01-27 21:00:00] 根据视图调整画布尺寸
        if (view === 'sleeve') {
          // 袖子区域较小（200x600）
          if (fabricCanvasRef.current) {
            fabricCanvasRef.current.setWidth(200);
            fabricCanvasRef.current.setHeight(600);
          }
        } else {
          // 正面和背面标准尺寸（500x600）
          if (fabricCanvasRef.current) {
            fabricCanvasRef.current.setWidth(500);
            fabricCanvasRef.current.setHeight(600);
          }
        }
        
        // 重新初始化打印区域
        if (fabricCanvasRef.current) {
          const fabric = await ensureFabric();
          await initializePrintArea(fabric, fabricCanvasRef.current);
        }
      }
    },
    [currentView, viewCanvases, setView, setCanvas, applySnapshotToCanvas, ensureFabric, initializePrintArea, handleZoomChange]
  );

  useEffect(() => {
    const detectUser = async () => {
      try {
        const current = await authApi.me();
        setUser(current as any);
      } catch (err) {
        setUser(null);
      }
    };
    detectUser();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 992);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && !user) {
      setMode('preview');
      setMobileLocked(true);
    } else if (isMobile && user) {
      setMode('quick-edit');
      setMobileLocked(false);
    } else {
      setMode('edit');
      setMobileLocked(false);
    }
  }, [isMobile, user, setMode, setMobileLocked]);

  const syncDesignToStore = useCallback(
    async (design: DesignDraft) => {
      setDraft(design);
      setDesignName(design.name);
      await applySnapshotToCanvas(design.canvasSnapshot);
    },
    [applySnapshotToCanvas, setDraft]
  );

  useEffect(() => {
    if (!canvas || !fabricCanvasRef.current) {
      return;
    }
    applySnapshotToCanvas(canvas);
  }, [canvas, applySnapshotToCanvas]);

  useEffect(() => {
    const loadDraft = async () => {
      try {
        setLoading(true);
        let draftData: DesignDraft | null = null;

        if (designIdParam) {
          const response = await designLabApi.getDraft(designIdParam) as any;
          draftData = response.data;
        } else if (variantIdParam) {
          const response = await designLabApi.createDraft({ productVariantId: variantIdParam }) as any;
          draftData = response.data;
          if (draftData) {
            const nextParams = new URLSearchParams(params?.toString() || '');
            nextParams.set('designId', draftData.id);
            router.replace(`/design-lab?${nextParams.toString()}`);
          }
        } else {
          setError('请通过产品详情页选择定制变体进入 Design Lab。');
          return;
        }

        if (draftData) {
          await syncDesignToStore(draftData);
        }
      } catch (err: any) {
        console.error('[2025-11-11 15:54:12] loadDraft error:', err);
        setError(err.message || '加载设计稿失败');
      } finally {
        setLoading(false);
        initialSyncRef.current = false;
      }
    };

    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designIdParam, variantIdParam]);

  useEffect(() => {
    const setupFabricEvents = async () => {
      if (!canvasElementRef.current) {
        return;
      }
      const fabric = await ensureFabric();
      if (!fabricCanvasRef.current) {
        fabricCanvasRef.current = new fabric.Canvas(canvasElementRef.current, {
          preserveObjectStacking: true,
          selection: true,
        });
      }

      const canvasInstance = fabricCanvasRef.current;
      canvasInstance.on('object:added', () => {
        handleCanvasChange();
        updateLayersFromCanvas();
      });
      canvasInstance.on('object:modified', handleCanvasChange);
      canvasInstance.on('object:removed', () => {
        handleCanvasChange();
        updateLayersFromCanvas();
      });
      canvasInstance.on('selection:created', handleSelectionChange);
      canvasInstance.on('selection:updated', handleSelectionChange);
      canvasInstance.on('selection:cleared', handleSelectionChange);
      canvasInstance.on('object:moving', () => {
        updateLayersFromCanvas();
      });

      // [2025-01-27 16:00:00] Initialize print area visualization
      initializePrintArea(fabric, canvasInstance);

      // [2025-01-27 15:40:00] Initial layer update
      updateLayersFromCanvas();

      return () => {
        canvasInstance.off('object:added');
        canvasInstance.off('object:modified');
        canvasInstance.off('object:removed');
        canvasInstance.off('selection:created');
        canvasInstance.off('selection:updated');
        canvasInstance.off('selection:cleared');
        canvasInstance.off('object:moving');
      };
    };

    setupFabricEvents();
  }, [ensureFabric, handleCanvasChange, handleSelectionChange, updateLayersFromCanvas, initializePrintArea]);

  useEffect(() => {
    if (!draft) {
      return;
    }
    if (initialSyncRef.current) {
      return;
    }
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const response = await designLabApi.updateDraft(draft.id, {
          canvas,
          name: designName,
          summary: 'Auto save',
        }) as any;
        patchDraft(response.data);
      } catch (err: any) {
        setError(err.message || '自动保存失败');
      } finally {
        setSaving(false);
      }
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [canvas, draft, designName, patchDraft]);

  useEffect(() => {
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (draft && designName === '') {
      setDesignName(draft.name);
    }
  }, [draft, designName]);

  useEffect(() => {
    // [2025-11-15 16:06:45] 根据画布对象数量控制指南面板显隐
    const layerCount = layers.length;
    const canvasObjectCount = Array.isArray(canvas?.objects) ? canvas.objects.length : 0;
    setHasArtwork(layerCount > 0 || canvasObjectCount > 0);
  }, [layers, canvas]);

  useEffect(() => {
    // [2025-11-15 16:07:05] 一旦用户开始创作就自动折叠指南
    if (hasArtwork) {
      setGuideCollapsed(true);
    }
  }, [hasArtwork]);

  const handleNameBlur = useCallback(async () => {
    if (!draft || designName.trim() === '' || designName === draft.name) {
      return;
    }
    try {
      setSaving(true);
      const response = await designLabApi.updateDraft(draft.id, { name: designName.trim(), summary: 'Rename design' }) as any;
      patchDraft(response.data);
    } catch (err: any) {
      setError(err.message || '更新设计名称失败');
      setDesignName(draft.name);
    } finally {
      setSaving(false);
    }
  }, [draft, designName, patchDraft]);

  const handleAddText = useCallback(async () => {
    const fabric = await ensureFabric();
    if (!fabricCanvasRef.current) {
      return;
    }
    const textbox = new fabric.Textbox('双击编辑文字', {
      left: 120,
      top: 160,
      fill: '#111111',
      fontSize: 28,
    }) as unknown as { id?: string; text?: string };
    textbox.id = uuidv4();
    fabricCanvasRef.current.add(textbox);
    fabricCanvasRef.current.setActiveObject(textbox);
    fabricCanvasRef.current.renderAll();
  }, [ensureFabric]);

  const handleDeleteSelection = useCallback(() => {
    const active = fabricCanvasRef.current?.getActiveObject();
    if (active && fabricCanvasRef.current) {
      fabricCanvasRef.current.remove(active);
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();
    }
  }, []);

  const handleUploadAsset = useCallback(async () => {
    if (!draft) {
      setError('尚未加载设计稿');
      return;
    }
    if (!user) {
      setError('请先登录后再上传素材');
      return;
    }
    fileInputRef.current?.click();
  }, [draft, user]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file || !draft) {
        return;
      }

      setUploading(true);
      try {
        const response = await designLabApi.generateAssetUpload(draft.id, {
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || 'application/octet-stream',
        }) as any;

        await fetch(response.data.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
        });

        const fabric = await ensureFabric();
        fabric.Image.fromURL(
          response.data.asset.url,
          (img: any) => {
            if (img) {
              const imageObject = img as any & { id?: string };
              imageObject.id = uuidv4();
              imageObject.set({
                left: 80,
                top: 80,
                scaleX: Math.min(1, 400 / (img.width || 400)),
                scaleY: Math.min(1, 400 / (img.height || 400)),
              });
              fabricCanvasRef.current?.add(imageObject);
              fabricCanvasRef.current?.setActiveObject(imageObject);
              fabricCanvasRef.current?.renderAll();
            }
          },
          { crossOrigin: 'anonymous' }
        );
      } catch (err: any) {
        console.error('[2025-11-11 15:54:12] handleFileChange error:', err);
        setError(err.message || '上传素材失败');
      } finally {
        setUploading(false);
      }
    },
    [draft, ensureFabric]
  );

  const addImageFromUrl = useCallback(
    async (imageUrl: string) => {
      // [2025-11-15 16:07:22] 预设图形插入：支持内置缩略图
      const fabric = await ensureFabric();
      if (!fabricCanvasRef.current) {
        return;
      }
      fabric.Image.fromURL(
        imageUrl,
        (img: any) => {
          if (img) {
            const imageObject = img as any & { id?: string };
            imageObject.id = uuidv4();
            imageObject.set({
              left: 100,
              top: 120,
              scaleX: Math.min(1, 360 / (img.width || 360)),
              scaleY: Math.min(1, 360 / (img.height || 360)),
            });
            fabricCanvasRef.current?.add(imageObject);
            fabricCanvasRef.current?.setActiveObject(imageObject);
            fabricCanvasRef.current?.renderAll();
          }
        },
        { crossOrigin: 'anonymous' }
      );
    },
    [ensureFabric]
  );

  const handleInsertPresetArt = useCallback(
    async (presetId: string) => {
      const preset = artPresets.find((item) => item.id === presetId);
      if (!preset) {
        return;
      }
      if (preset.type === 'image') {
        await addImageFromUrl(preset.src);
        return;
      }
      const fabric = await ensureFabric();
      if (!fabricCanvasRef.current) {
        return;
      }
      let newObject: any = null;
      if (preset.type === 'shape') {
        if (preset.shape === 'star') {
          const points = [
            { x: 0, y: -60 },
            { x: 18, y: -18 },
            { x: 60, y: -18 },
            { x: 24, y: 6 },
            { x: 36, y: 48 },
            { x: 0, y: 24 },
            { x: -36, y: 48 },
            { x: -24, y: 6 },
            { x: -60, y: -18 },
            { x: -18, y: -18 },
          ];
          newObject = new fabric.Polygon(points, {
            fill: preset.fill || '#fbbf24',
            left: 160,
            top: 160,
            scaleX: 1,
            scaleY: 1,
          });
        } else {
          newObject = new fabric.Rect({
            width: 200,
            height: 80,
            rx: 12,
            ry: 12,
            fill: preset.fill || '#38bdf8',
            left: 120,
            top: 180,
          });
        }
      } else if (preset.type === 'text') {
        newObject = new fabric.Textbox(preset.text || 'Custom', {
          left: 140,
          top: 160,
          fill: '#111111',
          fontSize: 42,
          fontWeight: 700,
        });
      }
      if (newObject) {
        newObject.id = uuidv4();
        fabricCanvasRef.current.add(newObject);
        fabricCanvasRef.current.setActiveObject(newObject);
        fabricCanvasRef.current.renderAll();
      }
    },
    [addImageFromUrl, artPresets, ensureFabric]
  );

  const triggerToolAction = useCallback(
    (tool: ToolKey) => {
      setSelectedTool(tool);
      switch (tool) {
        case 'upload':
          handleUploadAsset();
          break;
        case 'text':
          handleAddText();
          break;
        case 'art':
          break;
        case 'templates':
          // [2025-01-27 21:55:00] 打开模板库
          handleOpenTemplates();
          break;
        case 'comments':
          // [2025-01-27 21:55:00] 打开评论面板
          handleOpenComments();
          break;
        case 'products':
          router.push('/products');
          break;
        case 'colors':
          document.getElementById('lab-color-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        case 'names':
          // [2025-01-27 21:10:00] 批量命名功能
          handleBatchNames();
          break;
        case 'printArea':
          togglePrintArea();
          break;
        default:
          break;
      }
    },
    [handleAddText, handleUploadAsset, router, togglePrintArea]
  );

  const handleGuideActionTrigger = useCallback(
    (tool: ToolKey) => {
      triggerToolAction(tool);
      if (tool === 'upload' || tool === 'text' || tool === 'art') {
        setGuideCollapsed(true);
      }
    },
    [triggerToolAction]
  );

  const handleRequestQuote = useCallback(async () => {
    if (!draft) {
      return;
    }
    try {
      const response = await designLabApi.requestQuote(draft.id, quantity) as any;
      setQuote(response.data);
    } catch (err: any) {
      setError(err.message || '计算报价失败');
    }
  }, [draft, quantity]);

  const handleSubmitOrder = useCallback(async () => {
    if (!draft) {
      return;
    }
    try {
      const response = await designLabApi.submitOrder(draft.id, {
        quantity,
      });
      patchDraft((response as any).data.design);
      alert('设计已锁定并生成下单草稿，请前往购物车继续结账。');
    } catch (err: any) {
      setError(err.message || '提交订单失败，需登录才能继续');
    }
  }, [draft, patchDraft, quantity]);

  const textTargets = useMemo(() => {
    if (!fabricCanvasRef.current) {
      return [];
    }
    return fabricCanvasRef.current
      .getObjects('textbox')
      .map((obj: any) => obj as (any & { id?: string }))
      .map((textbox: any) => ({
        id: textbox.id || uuidv4(),
        text: textbox.text || '',
      }));
  }, []);

  const handleQuickEditChange = useCallback((id: string, value: string) => {
    if (!fabricCanvasRef.current) {
      return;
    }
    const target = fabricCanvasRef.current
      .getObjects()
      .find((obj: any) => (obj as { id?: string }).id === id) as { id?: string; text?: string } | undefined;
    if (target) {
      target.text = value;
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
    }
  }, [handleCanvasChange]);

  const handleProductColorSelect = useCallback((colorKey: string) => {
    // [2025-11-15 16:07:58] Inspector 色板切换
    setSelectedProductColor(colorKey);
  }, []);

  const handleAddProductsClick = useCallback(() => {
    router.push('/products');
  }, [router]);

  const handleGuideToggle = useCallback(() => {
    setGuideCollapsed((prev) => !prev);
  }, []);

  // [2025-01-27 21:10:00] 批量命名功能
  const handleBatchNames = useCallback(() => {
    setShowBatchNames(true);
  }, []);

  // [2025-01-27 21:10:00] 应用批量命名
  const handleApplyBatchNames = useCallback(() => {
    if (!fabricCanvasRef.current || !batchNames.trim()) {
      return;
    }

    const namesArray = batchNames
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (namesArray.length === 0) {
      setError('请输入至少一个名字');
      return;
    }

    const textObjects = fabricCanvasRef.current.getObjects('textbox') as Array<any & { id?: string; text?: string }>;
    
    if (textObjects.length === 0) {
      setError('画布上没有文字对象。请先添加文字。');
      setShowBatchNames(false);
      return;
    }

    // 将名字循环应用到所有文本框
    textObjects.forEach((textObj, index) => {
      const nameIndex = index % namesArray.length;
      textObj.set('text', namesArray[nameIndex]);
    });

    fabricCanvasRef.current.renderAll();
    handleCanvasChange();
    setShowBatchNames(false);
    setBatchNames('');
    setError(null);
  }, [batchNames, handleCanvasChange]);

  // [2025-01-27 21:15:00] 导出功能
  const handleExport = useCallback(async (format: 'png' | 'pdf' | 'svg') => {
    if (!fabricCanvasRef.current) {
      setError('无法导出：画布未初始化');
      return;
    }

    setExporting(true);
    try {
      const canvasInstance = fabricCanvasRef.current;
      
      if (format === 'png') {
        // 导出为 PNG
        const dataURL = canvasInstance.toDataURL({
          format: 'png',
          quality: 1.0,
          multiplier: 2, // 2x resolution for better quality
        });
        
        const link = document.createElement('a');
        link.download = `${designName || 'design'}-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
      } else if (format === 'svg') {
        // 导出为 SVG
        const svgData = canvasInstance.toSVG();
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `${designName || 'design'}-${Date.now()}.svg`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        // [2025-01-27 21:15:00] 导出为 PDF（使用 canvas toDataURL + jsPDF）
        try {
          // [2025-01-27 21:25:00] 动态导入 jsPDF，如果未安装则提示用户
          // @ts-ignore - jsPDF may not be installed
          const jsPDFModule = await import('jspdf').catch(() => null);
          if (!jsPDFModule) {
            setError('PDF 导出需要安装 jsPDF 库。请使用 PNG 或 SVG 格式。');
            return;
          }
          
          // @ts-ignore - jsPDF types may not be available
          const { default: jsPDF } = jsPDFModule;
          const dataURL = canvasInstance.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: 2,
          });
          
          const pdf = new jsPDF({
            orientation: canvasInstance.width > canvasInstance.height ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [canvasInstance.width * 0.264583, canvasInstance.height * 0.264583], // Convert pixels to mm
          });
          
          const imgWidth = pdf.internal.pageSize.getWidth();
          const imgHeight = (canvasInstance.height * imgWidth) / canvasInstance.width;
          
          pdf.addImage(dataURL, 'PNG', 0, 0, imgWidth, imgHeight);
          pdf.save(`${designName || 'design'}-${Date.now()}.pdf`);
        } catch (err: any) {
          setError('PDF 导出失败：' + (err.message || '未知错误'));
        }
      }
    } catch (err: any) {
      setError(err.message || '导出失败');
    } finally {
      setExporting(false);
    }
  }, [designName]);

  // [2025-01-27 21:20:00] 分享设计功能
  const handleShareDesign = useCallback(async () => {
    if (!draft) {
      setError('无法分享：设计稿不存在');
      return;
    }

    try {
      // 生成分享链接
      const shareUrl = `${window.location.origin}/design-lab?designId=${draft.id}&view=shared`;
      
      // 尝试使用 Web Share API（如果支持）
      if (navigator.share) {
        await navigator.share({
          title: `${designName || '我的设计'}`,
          text: '查看我的定制设计',
          url: shareUrl,
        });
      } else {
        // 回退：复制到剪贴板
        await navigator.clipboard.writeText(shareUrl);
        alert('分享链接已复制到剪贴板！');
      }
    } catch (err: any) {
      // 用户取消分享或出错，静默处理
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  }, [draft, designName]);

  // [2025-01-27 21:55:00] 打开模板库
  const handleOpenTemplates = useCallback(async () => {
    if (showTemplates) {
      setShowTemplates(false);
      return;
    }

    setShowTemplates(true);
    setLoadingTemplates(true);

    try {
      const response = await templateApi.list({ limit: 20, featured: true });
      setTemplates(response.data || []);
    } catch (err: any) {
      setError('加载模板失败：' + (err.message || '未知错误'));
    } finally {
      setLoadingTemplates(false);
    }
  }, [showTemplates]);

  // [2025-01-27 21:55:00] 应用模板
  const handleApplyTemplate = useCallback(async (template: DesignTemplate) => {
    if (!fabricCanvasRef.current || !template.designData) {
      return;
    }

    try {
      const fabric = await ensureFabric();
      
      // 清空当前画布
      fabricCanvasRef.current.clear();
      
      // 加载模板数据
      await applySnapshotToCanvas(template.designData);
      
      // 增加模板使用次数
      await templateApi.like(template.id);
      
      setShowTemplates(false);
      setError(null);
    } catch (err: any) {
      setError('应用模板失败：' + (err.message || '未知错误'));
    }
  }, [ensureFabric, applySnapshotToCanvas]);

  // [2025-01-27 21:55:00] 打开评论面板
  const handleOpenComments = useCallback(async () => {
    if (!draft) {
      setError('无法加载评论：设计稿不存在');
      return;
    }

    if (showComments) {
      setShowComments(false);
      return;
    }

    setShowComments(true);
    setLoadingComments(true);

    try {
      const response = await designCommentApi.list(draft.id, { limit: 50 });
      setComments(response.data || []);
    } catch (err: any) {
      setError('加载评论失败：' + (err.message || '未知错误'));
    } finally {
      setLoadingComments(false);
    }
  }, [draft, showComments]);

  // [2025-01-27 21:55:00] 提交评论
  const handleSubmitComment = useCallback(async () => {
    if (!draft || !newComment.trim()) {
      return;
    }

    setSubmittingComment(true);
    try {
      await designCommentApi.create(draft.id, {
        content: newComment.trim(),
        authorName: user ? undefined : (newCommentAuthor.trim() || 'Anonymous'),
      });
      
      // 重新加载评论
      const response = await designCommentApi.list(draft.id, { limit: 50 });
      setComments(response.data || []);
      
      setNewComment('');
      setNewCommentAuthor('');
      setError(null);
    } catch (err: any) {
      setError('提交评论失败：' + (err.message || '未知错误'));
    } finally {
      setSubmittingComment(false);
    }
  }, [draft, newComment, newCommentAuthor, user]);

  // [2025-01-27 21:55:00] 点赞评论
  const handleLikeComment = useCallback(async (commentId: string) => {
    try {
      await designCommentApi.like(commentId);
      
      // 更新本地评论数据
      setComments(comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, likesCount: comment.likesCount + 1 }
          : comment
      ));
    } catch (err: any) {
      console.error('Failed to like comment:', err);
    }
  }, [comments]);

  if (loading) {
    return (
      <section className="lab__loading">
        <p>正在加载 Design Lab...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="lab__error">
        <h1>Design Lab</h1>
        <p>{error}</p>
      </section>
    );
  }

  if (!draft) {
    return (
      <section className="lab__error">
        <h1>Design Lab</h1>
        <p>未找到设计草稿，请返回产品页重新进入。</p>
      </section>
    );
  }

  return (
    <div className="lab__container">
      <header className="lab__header">
        <div>
          <input
            className="lab__name-input"
            value={designName}
            onChange={(event) => setDesignName(event.target.value)}
            onBlur={handleNameBlur}
            disabled={mobileLocked}
          />
          <p className="lab__meta">
            草稿版本 v{draft.currentVersion} · {saving ? '自动保存中...' : '已自动保存'}
          </p>
        </div>
        <div className="lab__header-actions">
          <button type="button" onClick={undo} disabled={mobileLocked} className="lab__ghost-btn">
            撤销
          </button>
          <button type="button" onClick={redo} disabled={mobileLocked} className="lab__ghost-btn">
            重做
          </button>
          <button type="button" onClick={handleGuideToggle} className="lab__ghost-btn">
            {guideCollapsed ? '显示操作提示' : '隐藏操作提示'}
          </button>
        </div>
      </header>
      <div className="lab__grid lab__grid--five">
        <nav className="lab__rail" aria-label="编辑工具">
          {[
            { key: 'upload' as ToolKey, label: 'Upload', icon: '⬆️' },
            { key: 'text' as ToolKey, label: 'Add Text', icon: '🔤' },
            { key: 'art' as ToolKey, label: 'Add Art', icon: '🎨' },
            { key: 'templates' as ToolKey, label: 'Templates', icon: '📚' },
            { key: 'products' as ToolKey, label: 'Products', icon: '🧺' },
            { key: 'colors' as ToolKey, label: 'Product Colors', icon: '🎯' },
            { key: 'names' as ToolKey, label: 'Add Names', icon: '✍️' },
            { key: 'comments' as ToolKey, label: 'Comments', icon: '💬' },
            { key: 'printArea' as ToolKey, label: showPrintArea ? 'Hide Print Area' : 'Show Print Area', icon: '📐' },
          ].map((tool) => (
            <button
              key={`${tool.key}-${tool.label}`}
              type="button"
              className={`lab__rail-btn ${selectedTool === tool.key ? 'active' : ''}`}
              onClick={() => triggerToolAction(tool.key as ToolKey)}
              disabled={mobileLocked && tool.key !== 'products'}
            >
              <span aria-hidden="true">{tool.icon}</span>
              <span>{tool.label}</span>
            </button>
          ))}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </nav>

        <section className="lab__stage-wrap">
          {!guideCollapsed && !hasArtwork && (
            <div className="lab__guide-panel">
              <div>
                <p className="lab__guide-eyebrow">Step 1</p>
                <h3>What&apos;s next for you?</h3>
                <p className="lab__hint">拖拽文件或选择操作开始定制，支持 AI / PDF / PNG。</p>
              </div>
              <div className="lab__guide-actions">
                {guideActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    className="lab__guide-action"
                    onClick={() => handleGuideActionTrigger(action.key)}
                  >
                    <span className="lab__guide-icon" aria-hidden="true">
                      {action.icon}
                    </span>
                    <div>
                      <strong>{action.label}</strong>
                      <p>{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button type="button" className="lab__ghost-btn" onClick={handleGuideToggle}>
                知道了
              </button>
            </div>
          )}
          <main className="lab__stage">
            {mobileLocked && (
              <div className="lab__overlay">
                <p>移动端快速预览模式，请登录后在桌面端进行完整编辑。</p>
              </div>
            )}
            <div className="lab__view-controls">
              {['front', 'back', 'sleeve', 'zoom'].map((view) => {
                // [2025-01-27 21:25:00] zoom 视图只用于放大，不是真正的视图切换
                const isActive = view === 'zoom' 
                  ? zoomLevel > 100 // zoom 按钮在放大时高亮
                  : currentView === view;
                
                return (
                  <button
                    key={view}
                    type="button"
                    onClick={() => handleViewSwitch(view as 'front' | 'back' | 'sleeve' | 'zoom')}
                    disabled={mobileLocked}
                    className={`lab__view-btn ${isActive ? 'active' : ''}`}
                  >
                    {view === 'front' ? '正面' : view === 'back' ? '背面' : view === 'sleeve' ? '袖子' : '细节'}
                  </button>
                );
              })}
            </div>
            <div className="lab__zoom-controls">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={mobileLocked || zoomLevel <= 50}
                className="lab__zoom-btn"
                title="缩小"
              >
                −
              </button>
              <input
                type="range"
                min="50"
                max="400"
                step="10"
                value={zoomLevel}
                onChange={(e) => handleZoomChange(parseInt(e.target.value, 10))}
                disabled={mobileLocked}
                className="lab__zoom-slider"
              />
              <span className="lab__zoom-value">{zoomLevel}%</span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={mobileLocked || zoomLevel >= 400}
                className="lab__zoom-btn"
                title="放大"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                disabled={mobileLocked || zoomLevel === 100}
                className="lab__zoom-reset"
                title="重置缩放"
              >
                重置
              </button>
            </div>
            <canvas ref={canvasElementRef} width={canvas?.size?.width || 500} height={canvas?.size?.height || 600} />
          </main>
        </section>

        <aside className="lab__view-rail" aria-label="视图切换">
          <h3>视图缩略图</h3>
          <div className="lab__view-grid">
            {viewOptions.map((option) => {
              // [2025-01-27 21:25:00] zoom 视图只在视图选项中显示，但不是真正的视图
              const isActive = option.key === 'zoom'
                ? false // zoom 不是真正的视图，不显示为激活状态
                : currentView === option.key;
              
              return (
                <button
                  key={option.key}
                  type="button"
                  className={`lab__view-thumb ${isActive ? 'active' : ''}`}
                  onClick={() => handleViewSwitch(option.key)}
                  disabled={mobileLocked && option.key !== 'front'}
                >
                  <img src={option.thumbnail} alt={`${option.label} preview`} loading="lazy" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
          <p className="lab__hint">切换不同角度确认图案位置，Zoom 视图用于检查细节。</p>
        </aside>

        <aside className="lab__inspector" aria-label="产品信息">
          <div className="inspector__card">
            <div className="inspector__product">
              <img src="/assets/cat-sweatshirt.webp" alt="当前产品" width={56} height={56} />
              <div>
                <strong>Gildan Softstyle Jersey T-shirt</strong>
                <p className="lab__hint">支持数码直喷、丝网印、刺绣</p>
              </div>
            </div>
            <div id="lab-color-section" className="lab__color-swatches">
              {productColors.map((color) => (
                <button
                  key={color.key}
                  type="button"
                  className={`lab__color-swatch ${selectedProductColor === color.key ? 'selected' : ''}`}
                  style={{ backgroundColor: color.swatch }}
                  onClick={() => handleProductColorSelect(color.key)}
                >
                  <span className="sr-only">{color.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="inspector__section">
            <h3>艺术素材库</h3>
            <div className="lab__art-grid">
              {artPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="lab__art-card"
                  onClick={() => handleInsertPresetArt(preset.id)}
                >
                  <div className="lab__art-thumb" aria-hidden="true">
                    {preset.type === 'image' ? (
                      <img src={preset.src} alt={preset.label} loading="lazy" />
                    ) : (
                      <span>{preset.type === 'text' ? preset.text : '★'}</span>
                    )}
                  </div>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* [2025-01-27 21:55:00] 设计模板库 */}
          <div className="inspector__section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3>设计模板库</h3>
              <button
                type="button"
                onClick={handleOpenTemplates}
                className="lab__ghost-btn"
                style={{ padding: '6px 12px', fontSize: '14px' }}
              >
                {showTemplates ? '隐藏' : '浏览'}
              </button>
            </div>
            {showTemplates && (
              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                {loadingTemplates ? (
                  <p className="lab__hint">加载模板中...</p>
                ) : templates.length === 0 ? (
                  <p className="lab__hint">暂无模板</p>
                ) : (
                  <div className="lab__template-grid" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className="lab__template-card"
                        onClick={() => handleApplyTemplate(template)}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px',
                          background: 'white',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#ff1f3d';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {template.thumbnailUrl ? (
                          <img
                            src={template.thumbnailUrl}
                            alt={template.name}
                            loading="lazy"
                            style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '80px', background: '#f3f4f6', borderRadius: '4px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#9ca3af' }}>📐</span>
                          </div>
                        )}
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{template.name}</div>
                        {template.category && (
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>{template.category}</div>
                        )}
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                          👍 {template.likesCount} · 📊 {template.usageCount}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="inspector__section">
            <h3>快速编辑</h3>
            {mode === 'preview' && (
              <p className="lab__hint">登录后可在移动端修改文字，或前往桌面端体验完整功能。</p>
            )}
            {selectedTextObject && mode !== 'preview' && (
              <div className="lab__text-tools">
                <h4>文字样式</h4>
                <label className="lab__field">
                  <span>字体大小</span>
                  <input
                    type="number"
                    min="8"
                    max="200"
                    value={selectedTextObject.fontSize || 28}
                    onChange={(e) => handleTextFontSizeChange(parseInt(e.target.value, 10) || 28)}
                    disabled={mobileLocked}
                  />
                </label>
                <div className="lab__text-format-buttons">
                  <button
                    type="button"
                    className={`lab__format-btn ${selectedTextObject.fontWeight === 'bold' ? 'active' : ''}`}
                    onClick={handleTextBoldToggle}
                    disabled={mobileLocked}
                    title="粗体"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    className={`lab__format-btn ${selectedTextObject.fontStyle === 'italic' ? 'active' : ''}`}
                    onClick={handleTextItalicToggle}
                    disabled={mobileLocked}
                    title="斜体"
                  >
                    <em>I</em>
                  </button>
                  <button
                    type="button"
                    className={`lab__format-btn ${selectedTextObject.underline ? 'active' : ''}`}
                    onClick={handleTextUnderlineToggle}
                    disabled={mobileLocked}
                    title="下划线"
                  >
                    <u>U</u>
                  </button>
                </div>
                <div className="lab__text-align-buttons">
                  <span className="lab__field-label">对齐方式</span>
                  <div className="lab__align-buttons">
                    <button
                      type="button"
                      className={`lab__align-btn ${selectedTextObject.textAlign === 'left' ? 'active' : ''}`}
                      onClick={() => handleTextAlign('left')}
                      disabled={mobileLocked}
                      title="左对齐"
                    >
                      ⬅️
                    </button>
                    <button
                      type="button"
                      className={`lab__align-btn ${selectedTextObject.textAlign === 'center' ? 'active' : ''}`}
                      onClick={() => handleTextAlign('center')}
                      disabled={mobileLocked}
                      title="居中"
                    >
                      ⬌
                    </button>
                    <button
                      type="button"
                      className={`lab__align-btn ${selectedTextObject.textAlign === 'right' ? 'active' : ''}`}
                      onClick={() => handleTextAlign('right')}
                      disabled={mobileLocked}
                      title="右对齐"
                    >
                      ➡️
                    </button>
                    <button
                      type="button"
                      className={`lab__align-btn ${selectedTextObject.textAlign === 'justify' ? 'active' : ''}`}
                      onClick={() => handleTextAlign('justify')}
                      disabled={mobileLocked}
                      title="两端对齐"
                    >
                      ⬌⬌
                    </button>
                  </div>
                </div>
                <label className="lab__field">
                  <span>文字颜色</span>
                  <div className="lab__color-input-wrapper">
                    <input
                      type="color"
                      value={selectedTextObject.fill || '#111111'}
                      onChange={(e) => handleTextColorChange(e.target.value)}
                      disabled={mobileLocked}
                      className="lab__color-input"
                    />
                    <input
                      type="text"
                      value={selectedTextObject.fill || '#111111'}
                      onChange={(e) => handleTextColorChange(e.target.value)}
                      disabled={mobileLocked}
                      className="lab__color-text-input"
                      placeholder="#111111"
                    />
                  </div>
                </label>
                <label className="lab__field">
                  <span>文字内容</span>
                  <textarea
                    value={selectedTextObject.text || ''}
                    onChange={(e) => {
                      if (selectedTextObject) {
                        selectedTextObject.set('text', e.target.value);
                        fabricCanvasRef.current?.renderAll();
                        handleCanvasChange();
                        setSelectedTextObject({ ...selectedTextObject, text: e.target.value });
                      }
                    }}
                    disabled={mobileLocked}
                    rows={3}
                  />
                </label>
              </div>
            )}
            {!selectedTextObject && mode !== 'preview' && textTargets.length === 0 && (
              <p className="lab__hint">暂无可编辑文字对象，点击左侧“Add Text”开始创作，或选择一个对象。</p>
            )}
            {!selectedTextObject &&
              mode !== 'preview' &&
              textTargets.map((target: any) => (
                <label key={target.id} className="lab__field">
                  <span>文字块</span>
                  <textarea
                    value={target.text}
                    onChange={(event) => handleQuickEditChange(target.id, event.target.value)}
                    disabled={mobileLocked}
                  />
                </label>
              ))}
          </div>
          <div className="inspector__section">
            <h3>图层管理</h3>
            {layers.length === 0 ? (
              <p className="lab__hint">暂无图层，添加文字或图片后会自动显示在这里。</p>
            ) : (
              <div className="lab__layers-list">
                {layers.map((layer, index) => (
                  <div
                    key={layer.id}
                    className={`lab__layer-item ${activeObjectId === layer.id ? 'active' : ''} ${!layer.visible ? 'hidden' : ''}`}
                    onClick={() => handleLayerSelect(layer.id)}
                  >
                    <div className="lab__layer-info">
                      <span className="lab__layer-icon">
                        {layer.type === 'textbox' || layer.type === 'i-text' || layer.type === 'text' ? 'T' : '🖼️'}
                      </span>
                      <span className="lab__layer-name" title={layer.name}>
                        {layer.name}
                      </span>
                    </div>
                    <div className="lab__layer-actions">
                      <button
                        type="button"
                        className="lab__layer-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLayerVisibilityToggle(layer.id);
                        }}
                        title={layer.visible ? '隐藏' : '显示'}
                      >
                        {layer.visible ? '👁️' : '👁️‍🗨️'}
                      </button>
                      <button
                        type="button"
                        className="lab__layer-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLayerLockToggle(layer.id);
                        }}
                        title={layer.locked ? '解锁' : '锁定'}
                      >
                        {layer.locked ? '🔒' : '🔓'}
                      </button>
                      {index > 0 && (
                        <button
                          type="button"
                          className="lab__layer-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBringToFront(layer.id);
                          }}
                          title="置顶"
                        >
                          ⬆️
                        </button>
                      )}
                      {index < layers.length - 1 && (
                        <button
                          type="button"
                          className="lab__layer-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendToBack(layer.id);
                          }}
                          title="置底"
                        >
                          ⬇️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* [2025-01-27 21:55:00] 设计评论面板 */}
          {draft && (
            <div className="inspector__section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3>评论与反馈</h3>
                <button
                  type="button"
                  onClick={handleOpenComments}
                  className="lab__ghost-btn"
                  style={{ padding: '6px 12px', fontSize: '14px' }}
                >
                  {showComments ? '隐藏' : '查看'}
                </button>
              </div>
              {showComments && (
                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                  {loadingComments ? (
                    <p className="lab__hint">加载评论中...</p>
                  ) : (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        {comments.length === 0 ? (
                          <p className="lab__hint">暂无评论</p>
                        ) : (
                          <div style={{ display: 'grid', gap: '12px' }}>
                            {comments.map((comment) => (
                              <div
                                key={comment.id}
                                style={{
                                  borderBottom: '1px solid #e5e7eb',
                                  paddingBottom: '12px',
                                  paddingTop: comment.parentId ? '8px' : '0',
                                  marginLeft: comment.parentId ? '24px' : '0',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                  <div>
                                    <strong style={{ fontSize: '13px' }}>
                                      {comment.authorName || (comment.userId ? 'User' : 'Anonymous')}
                                    </strong>
                                    <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>
                                      {new Date(comment.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleLikeComment(comment.id)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#6b7280',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      padding: '4px 8px',
                                    }}
                                  >
                                    👍 {comment.likesCount}
                                  </button>
                                </div>
                                <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>{comment.content}</p>
                                {/* 显示回复 */}
                                {comment.replies && comment.replies.length > 0 && (
                                  <div style={{ marginTop: '8px', paddingLeft: '16px', borderLeft: '2px solid #e5e7eb' }}>
                                    {comment.replies.map((reply) => (
                                      <div key={reply.id} style={{ marginBottom: '8px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                                          {reply.authorName || 'Anonymous'}
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>{reply.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* [2025-01-27 21:55:00] 评论输入框 */}
                      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                        {!user && (
                          <input
                            type="text"
                            placeholder="您的姓名（可选）"
                            value={newCommentAuthor}
                            onChange={(e) => setNewCommentAuthor(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '13px',
                              marginBottom: '8px',
                            }}
                          />
                        )}
                        <textarea
                          placeholder="写下您的评论..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '13px',
                            marginBottom: '8px',
                            resize: 'vertical',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSubmitComment}
                          disabled={!newComment.trim() || submittingComment}
                          className="lab__primary-btn"
                          style={{
                            width: '100%',
                            padding: '8px',
                            fontSize: '13px',
                            opacity: (!newComment.trim() || submittingComment) ? 0.5 : 1,
                          }}
                        >
                          {submittingComment ? '提交中...' : '提交评论'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          
          <details open>
            <summary>尺码 & 版型</summary>
            <div className="panel">
              <p>成人：S - 5XL · 青少年：YXS - YL</p>
              <a href="/size-guide" className="lab__link">
                查看尺码表
              </a>
            </div>
          </details>
          <details>
            <summary>运输与时效</summary>
            <div className="panel">
              <p>免费 2 周送达，可加购 3 天加急。</p>
            </div>
          </details>
          <details>
            <summary>特殊印刷区域</summary>
            <div className="panel">
              <p>支持正面 / 背面 / 左右袖，衣摆 10cm 内建议使用安全区。</p>
            </div>
          </details>
        </aside>
      </div>

      <div className="lab__bottom-bar">
        <div className="lab__bottom-left">
          <button type="button" className="lab__ghost-btn" onClick={handleAddProductsClick}>
            添加产品
          </button>
          <div className="lab__product-pill">
            <img src="/assets/cat-tshirt.webp" alt="当前产品" width={48} height={48} />
            <div>
              <p>Softstyle Jersey Tee</p>
              <small>颜色：{productColors.find((c) => c.key === selectedProductColor)?.label}</small>
            </div>
          </div>
        </div>
        <div className="lab__bottom-right">
          <label className="lab__quantity-field">
            <span>订购数量</span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(parseInt(event.target.value, 10) || 1, 1))}
            />
          </label>
          {quote && (
            <p className="lab__quote">
              每件 {quote.currency} {quote.unitPrice.toFixed(2)} · 总计 {quote.currency} {quote.total.toFixed(2)}
            </p>
          )}
          <div className="lab__bottom-actions">
            {/* [2025-01-27 21:15:00] 导出菜单 */}
            <div className="lab__export-menu" style={{ position: 'relative' }}>
              <button
                type="button"
                className="lab__ghost-btn"
                onClick={() => {
                  const menu = document.getElementById('export-dropdown');
                  if (menu) {
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                  }
                }}
                disabled={exporting}
              >
                {exporting ? '导出中...' : '导出'}
              </button>
              <div
                id="export-dropdown"
                style={{
                  display: 'none',
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  marginBottom: '8px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  padding: '8px',
                  minWidth: '120px',
                  zIndex: 1000,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleExport('png');
                    document.getElementById('export-dropdown')!.style.display = 'none';
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport('svg');
                    document.getElementById('export-dropdown')!.style.display = 'none';
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  SVG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport('pdf');
                    document.getElementById('export-dropdown')!.style.display = 'none';
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  PDF
                </button>
              </div>
            </div>
            <button type="button" className="lab__ghost-btn" onClick={handleShareDesign}>
              分享
            </button>
            <button type="button" className="lab__ghost-btn" onClick={handleRequestQuote}>
              获取报价
            </button>
            <button type="button" className="lab__primary-btn" onClick={handleSubmitOrder} disabled={!user}>
              保存并生成订单草稿
            </button>
          </div>
        </div>
      </div>

      {/* [2025-01-27 21:10:00] 批量命名对话框 */}
      {showBatchNames && (
        <div
          className="lab__modal-overlay"
          onClick={() => setShowBatchNames(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            className="lab__modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            <h2 style={{ marginTop: 0 }}>批量添加名字</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              每行输入一个名字，系统会将名字循环应用到画布上的所有文本框。
            </p>
            <textarea
              value={batchNames}
              onChange={(e) => setBatchNames(e.target.value)}
              placeholder="例如：&#10;John&#10;Jane&#10;Mike&#10;Sarah"
              rows={8}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowBatchNames(false);
                  setBatchNames('');
                }}
                className="lab__ghost-btn"
              >
                取消
              </button>
              <button type="button" onClick={handleApplyBatchNames} className="lab__primary-btn">
                应用
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="lab__recos" aria-label="推荐产品">
        <div className="lab__recos-grid">
          {recommendations.map((item) => (
            <article key={item.id} className="lab__reco-card">
              <img src={item.image} alt={item.title} loading="lazy" />
              <div>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <button type="button" className="lab__ghost-btn" onClick={handleAddProductsClick}>
                  添加到方案
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <style jsx>{`
        /* [2025-11-15 16:08:50] Design Lab 5 区域布局样式 */
        .lab__container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: #f5f5f5;
        }
        .lab__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
          background: #ffffff;
          border-bottom: 1px solid #e5e5e5;
        }
        .lab__header-actions {
          display: flex;
          gap: 12px;
        }
        .lab__name-input {
          font-size: 20px;
          font-weight: 600;
          border: none;
          background: transparent;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background-color 0.2s ease;
        }
        .lab__name-input:focus {
          outline: none;
          background: rgba(0, 0, 0, 0.05);
        }
        .lab__meta {
          margin-top: 4px;
          font-size: 12px;
          color: #777;
        }
        .lab__grid {
          flex: 1;
          display: grid;
          min-height: 0;
        }
        .lab__grid--five {
          grid-template-columns: 140px minmax(520px, 1fr) 160px 340px;
          grid-template-rows: 1fr;
        }
        .lab__rail {
          background: #1f2937;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 24px 12px;
        }
        .lab__rail-btn {
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          cursor: pointer;
          transition: background 0.2s ease, border 0.2s ease;
        }
        .lab__rail-btn span:first-child {
          font-size: 18px;
        }
        .lab__rail-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.18);
        }
        .lab__rail-btn.active {
          background: rgba(255, 31, 61, 0.2);
          border: 1px solid rgba(255, 31, 61, 0.5);
        }
        .lab__stage-wrap {
          position: relative;
          background: #f8fafc;
          padding: 32px;
        }
        .lab__stage {
          position: relative;
          background: #f1f5f9;
          border: 1px dashed #e2e8f0;
          border-radius: 16px;
          min-height: 520px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lab__overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
          font-size: 16px;
          color: #555;
          z-index: 2;
          border-radius: 16px;
        }
        .lab__guide-panel {
          position: absolute;
          top: 32px;
          left: 32px;
          right: 32px;
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
          z-index: 11;
          display: grid;
          gap: 16px;
        }
        .lab__guide-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 11px;
          color: #9ca3af;
          margin: 0;
        }
        .lab__guide-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }
        .lab__guide-action {
          display: flex;
          gap: 12px;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 12px;
          background: #f9fafb;
          cursor: pointer;
          text-align: left;
        }
        .lab__guide-action strong {
          display: block;
          margin-bottom: 4px;
        }
        .lab__guide-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #fff1f2;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #ff1f3d;
        }
        .lab__view-controls {
          position: absolute;
          top: 20px;
          left: 20px;
          display: flex;
          gap: 8px;
          background: rgba(255, 255, 255, 0.94);
          padding: 4px;
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
          z-index: 10;
        }
        .lab__view-btn {
          padding: 8px 14px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          background: transparent;
          color: #475569;
          cursor: pointer;
        }
        .lab__view-btn.active {
          background: #fff5f5;
          color: #ff1f3d;
        }
        .lab__zoom-controls {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.94);
          padding: 8px 12px;
          border-radius: 999px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
        }
        .lab__zoom-btn,
        .lab__zoom-reset {
          border: none;
          background: transparent;
          font-size: 18px;
          cursor: pointer;
        }
        .lab__zoom-slider {
          width: 140px;
        }
        .lab__view-rail {
          background: #ffffff;
          border-left: 1px solid #e5e5e5;
          padding: 24px 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .lab__view-grid {
          display: grid;
          gap: 12px;
        }
        .lab__view-thumb {
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          padding: 8px;
          background: #f9fafb;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
        }
        .lab__view-thumb img {
          width: 100%;
          border-radius: 8px;
          object-fit: cover;
        }
        .lab__inspector {
          background: #ffffff;
          border-left: 1px solid #e5e5e5;
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .inspector__card,
        .inspector__section {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 16px;
          padding: 16px;
        }
        .inspector__product {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .inspector__product img {
          border-radius: 12px;
        }
        .lab__color-swatches {
          margin-top: 16px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .lab__color-swatch {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
        }
        .lab__color-swatch.selected {
          border-color: #ff1f3d;
        }
        .lab__art-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }
        .lab__art-card {
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          padding: 12px;
          background: #f9fafb;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: pointer;
        }
        .lab__art-thumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .lab__text-tools {
          border-bottom: 1px solid #e5e5e5;
          padding-bottom: 16px;
          margin-bottom: 16px;
        }
        .lab__text-format-buttons,
        .lab__align-buttons {
          display: flex;
          gap: 8px;
        }
        .lab__format-btn,
        .lab__align-btn {
          flex: 1;
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 8px;
          cursor: pointer;
          padding: 6px;
        }
        .lab__format-btn.active,
        .lab__align-btn.active {
          border-color: #ff1f3d;
          background: #fff5f5;
        }
        .lab__layers-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .lab__layer-item {
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
        }
        .lab__layer-item.active {
          border-color: #ff1f3d;
          background: #fff5f5;
        }
        .lab__layer-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }
        .lab__layer-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lab__layer-actions {
          display: flex;
          gap: 4px;
        }
        .lab__layer-action-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          cursor: pointer;
        }
        .lab__hint {
          font-size: 13px;
          color: #6b7280;
        }
        .panel {
          margin-top: 10px;
          border-top: 1px solid #e5e5e5;
          padding-top: 10px;
          font-size: 14px;
        }
        .lab__link {
          display: inline-block;
          margin-top: 6px;
          color: #2563eb;
        }
        .lab__bottom-bar {
          background: #ffffff;
          border-top: 1px solid #e5e5e5;
          padding: 20px 32px;
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }
        .lab__product-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #e5e5e5;
          padding: 8px 12px;
          border-radius: 999px;
          background: #f9fafb;
        }
        .lab__product-pill img {
          border-radius: 50%;
        }
        .lab__quantity-field {
          display: flex;
          flex-direction: column;
          font-size: 14px;
        }
        .lab__quantity-field input {
          width: 120px;
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
        }
        .lab__bottom-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .lab__ghost-btn {
          background: transparent;
          border: 1px solid #d0d0d0;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
        }
        .lab__ghost-btn:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.05);
        }
        .lab__primary-btn {
          border: none;
          background: #0066cc;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .lab__primary-btn:hover:not(:disabled) {
          background: #0055aa;
        }
        .lab__recos {
          padding: 24px 32px 48px;
        }
        .lab__recos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .lab__reco-card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .lab__reco-card img {
          width: 72px;
          height: 72px;
          border-radius: 12px;
          object-fit: cover;
        }
        .lab__quote {
          font-size: 14px;
          color: #1f2937;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }
        .lab__loading,
        .lab__error {
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 32px;
          text-align: center;
        }
        @media (max-width: 991px) {
          .lab__grid--five {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto auto;
          }
          .lab__rail {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
          }
          .lab__stage-wrap,
          .lab__view-rail,
          .lab__inspector {
            padding: 16px;
          }
          .lab__view-controls {
            position: static;
            transform: none;
            box-shadow: none;
            margin-bottom: 12px;
          }
          .lab__zoom-controls {
            position: static;
            transform: none;
            margin-top: 12px;
          }
          .lab__bottom-bar {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

    </div>
  );
};

export default DesignLabClient;


