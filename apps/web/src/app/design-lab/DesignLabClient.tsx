'use client';

/**
 * Design Lab Client
 * [2025-11-11 15:54:12] Fabric.js + Zustand 前端编辑器骨架，实现桌面编辑与移动端快速编辑
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { authApi, designLabApi, type DesignDraft, type DesignCanvasSnapshot } from '@/lib/api';
import { useDesignLabStore, type LayerInfo } from '@/contexts/designLabStore';

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

  const { draft, canvas, mode, mobileLocked, layers } = useDesignLabStore((state) => ({
    draft: state.draft,
    canvas: state.canvas,
    mode: state.mode,
    mobileLocked: state.mobileLocked,
    layers: state.layers,
  }));
  const setDraft = useDesignLabStore((state) => state.setDraft);
  const patchDraft = useDesignLabStore((state) => state.patchDraft);
  const setCanvas = useDesignLabStore((state) => state.setCanvas);
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
  const [activeTab, setActiveTab] = useState<'edit' | 'layers'>('edit');
  const [selectedTextObject, setSelectedTextObject] = useState<any>(null);
  const [showPrintArea, setShowPrintArea] = useState(true);
  const printAreaRef = useRef<any>(null);
  const safeAreaRef = useRef<any>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentView, setCurrentView] = useState<'front' | 'back' | 'sleeve'>('front');

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
  const handleViewSwitch = useCallback(
    (view: 'front' | 'back' | 'sleeve') => {
      setCurrentView(view);
      // In a real implementation, this would switch the canvas content
      // For now, we just update the state
      // TODO: Implement actual view switching with different canvas snapshots
    },
    []
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
        </div>
      </header>
      <div className="lab__grid">
        <nav className="lab__rail">
          <button type="button" onClick={handleAddText} disabled={mobileLocked} className="lab__rail-btn">
            添加文字
          </button>
          <button type="button" onClick={handleUploadAsset} disabled={mobileLocked || uploading} className="lab__rail-btn">
            {uploading ? '上传中...' : '上传图片'}
          </button>
          <button type="button" onClick={handleDeleteSelection} disabled={mobileLocked} className="lab__rail-btn">
            删除对象
          </button>
          {/* [2025-01-27 16:00:00] Print area toggle */}
          <button
            type="button"
            onClick={togglePrintArea}
            disabled={mobileLocked}
            className={`lab__rail-btn ${showPrintArea ? 'active' : ''}`}
            title={showPrintArea ? '隐藏打印区域' : '显示打印区域'}
          >
            {showPrintArea ? '📐 打印区域' : '📐'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </nav>
        <main className="lab__stage">
          {mobileLocked && (
            <div className="lab__overlay">
              <p>移动端快速预览模式，请登录后在桌面端进行完整编辑。</p>
            </div>
          )}
          {/* [2025-01-27 16:10:00] View switching controls */}
          <div className="lab__view-controls">
            <button
              type="button"
              onClick={() => handleViewSwitch('front')}
              disabled={mobileLocked}
              className={`lab__view-btn ${currentView === 'front' ? 'active' : ''}`}
              title="正面"
            >
              正面
            </button>
            <button
              type="button"
              onClick={() => handleViewSwitch('back')}
              disabled={mobileLocked}
              className={`lab__view-btn ${currentView === 'back' ? 'active' : ''}`}
              title="背面"
            >
              背面
            </button>
            <button
              type="button"
              onClick={() => handleViewSwitch('sleeve')}
              disabled={mobileLocked}
              className={`lab__view-btn ${currentView === 'sleeve' ? 'active' : ''}`}
              title="袖子"
            >
              袖子
            </button>
          </div>
          {/* [2025-01-27 16:05:00] Zoom controls */}
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
        <aside className="lab__sidebar">
          {/* [2025-01-27 15:40:00] Tab navigation */}
          <div className="lab__sidebar-tabs">
            <button
              type="button"
              className={`lab__tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
              onClick={() => setActiveTab('edit')}
            >
              快速编辑
            </button>
            <button
              type="button"
              className={`lab__tab-btn ${activeTab === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveTab('layers')}
            >
              图层
            </button>
          </div>

          {/* [2025-01-27 15:40:00] Edit Tab */}
          {activeTab === 'edit' && (
            <div className="lab__tab-content">
          <h3>快速编辑</h3>
          {mode === 'preview' && (
            <p className="lab__hint">登录后可在移动端进行文字修改，或前往桌面端体验完整功能。</p>
          )}

              {/* [2025-01-27 15:50:00] Advanced text tools for selected text object */}
              {selectedTextObject && mode !== 'preview' && (
                <div className="lab__text-tools">
                  <h4>文字样式</h4>
                  
                  {/* Font Size */}
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

                  {/* Text Formatting */}
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

                  {/* Text Alignment */}
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

                  {/* Text Color */}
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

                  {/* Text Content */}
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

              {/* Quick edit for all text objects */}
              {!selectedTextObject && mode !== 'preview' && textTargets.length === 0 && (
                <p className="lab__hint">暂无可编辑文字对象，点击左侧&ldquo;添加文字&rdquo;开始创作，或选择一个文字对象进行编辑。</p>
              )}
              {!selectedTextObject && mode !== 'preview' &&
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
          )}

          {/* [2025-01-27 15:40:00] Layers Tab */}
          {activeTab === 'layers' && (
            <div className="lab__tab-content">
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
          )}
        </aside>
      </div>
      <footer className="lab__footer">
        <div className="lab__footer-left">
          <label className="lab__field">
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
        </div>
        <div className="lab__footer-actions">
          <button type="button" className="lab__ghost-btn" onClick={handleRequestQuote}>
            获取报价
          </button>
          <button type="button" className="lab__primary-btn" onClick={handleSubmitOrder} disabled={!user}>
            保存并生成订单草稿
          </button>
        </div>
      </footer>
      <style jsx>{`
        /* [2025-11-11 15:54:12] Design Lab 布局样式 */
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
          grid-template-columns: 80px 1fr 320px;
          grid-template-rows: 1fr;
          min-height: 0;
        }
        .lab__rail {
          background: #2c2c2c;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 24px 12px;
        }
        .lab__rail-btn {
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: white;
          padding: 10px 8px;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .lab__rail-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.16);
        }
        .lab__rail-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .lab__rail-btn.active {
          background: rgba(255, 31, 61, 0.2);
          border: 1px solid rgba(255, 31, 61, 0.5);
        }
        /* [2025-01-27 16:10:00] View switching controls */
        .lab__view-controls {
          position: absolute;
          top: 16px;
          left: 16px;
          display: flex;
          gap: 8px;
          background: rgba(255, 255, 255, 0.95);
          padding: 4px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 10;
        }
        .lab__view-btn {
          padding: 8px 16px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s ease;
        }
        .lab__view-btn:hover:not(:disabled) {
          background: #f8fafc;
          color: #334155;
        }
        .lab__view-btn.active {
          background: #fff5f5;
          color: #ff1f3d;
          font-weight: 600;
        }
        .lab__view-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .lab__stage {
          position: relative;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
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
        }
        .lab__sidebar {
          background: #ffffff;
          border-left: 1px solid #e5e5e5;
          padding: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        /* [2025-01-27 15:40:00] Sidebar tabs */
        .lab__sidebar-tabs {
          display: flex;
          border-bottom: 1px solid #e5e5e5;
          background: #f8fafc;
        }
        .lab__tab-btn {
          flex: 1;
          padding: 12px 16px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
        }
        .lab__tab-btn:hover {
          background: #f1f5f9;
          color: #334155;
        }
        .lab__tab-btn.active {
          color: #ff1f3d;
          border-bottom-color: #ff1f3d;
          background: #ffffff;
        }
        .lab__tab-content {
          padding: 24px;
          flex: 1;
          overflow-y: auto;
        }
        .lab__tab-content h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
        }
        /* [2025-01-27 15:40:00] Layers list */
        .lab__layers-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .lab__layer-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s ease;
          border: 1px solid transparent;
        }
        .lab__layer-item:hover {
          background: #f8fafc;
        }
        .lab__layer-item.active {
          background: #fff5f5;
          border-color: #ff1f3d;
        }
        .lab__layer-item.hidden {
          opacity: 0.5;
        }
        .lab__layer-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }
        .lab__layer-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .lab__layer-name {
          font-size: 14px;
          color: #334155;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lab__layer-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .lab__layer-action-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: background 0.2s ease;
        }
        .lab__layer-action-btn:hover {
          background: #e2e8f0;
        }
        .lab__hint {
          font-size: 14px;
          color: #777;
          line-height: 1.5;
        }
        /* [2025-01-27 15:50:00] Advanced text tools styles */
        .lab__text-tools {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e5e5e5;
        }
        .lab__text-tools h4 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #334155;
        }
        .lab__text-format-buttons {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .lab__format-btn {
          width: 36px;
          height: 36px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .lab__format-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .lab__format-btn.active {
          background: #fff5f5;
          border-color: #ff1f3d;
          color: #ff1f3d;
        }
        .lab__format-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .lab__text-align-buttons {
          margin-bottom: 16px;
        }
        .lab__field-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #334155;
          margin-bottom: 8px;
        }
        .lab__align-buttons {
          display: flex;
          gap: 8px;
        }
        .lab__align-btn {
          flex: 1;
          height: 36px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s ease;
        }
        .lab__align-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .lab__align-btn.active {
          background: #fff5f5;
          border-color: #ff1f3d;
        }
        .lab__align-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .lab__color-input-wrapper {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .lab__color-input {
          width: 60px;
          height: 36px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
        }
        .lab__color-text-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          font-family: monospace;
        }
        .lab__color-text-input:focus {
          outline: none;
          border-color: #ff1f3d;
        }
        .lab__field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }
        .lab__field textarea {
          min-height: 80px;
          padding: 8px;
          border: 1px solid #d0d0d0;
          border-radius: 8px;
          resize: vertical;
        }
        .lab__field input[type='number'] {
          padding: 8px;
          border: 1px solid #d0d0d0;
          border-radius: 8px;
          width: 150px;
        }
        .lab__footer {
          background: #ffffff;
          border-top: 1px solid #e5e5e5;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .lab__footer-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .lab__quote {
          font-size: 14px;
          color: #333;
        }
        .lab__footer-actions {
          display: flex;
          gap: 12px;
        }
        .lab__ghost-btn {
          background: transparent;
          border: 1px solid #d0d0d0;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .lab__ghost-btn:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.05);
        }
        .lab__ghost-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .lab__primary-btn {
          border: none;
          background: #0066cc;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s ease;
        }
        .lab__primary-btn:hover:not(:disabled) {
          background: #0055aa;
        }
        .lab__primary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
          .lab__grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto 1fr;
          }
          .lab__rail {
            flex-direction: row;
            justify-content: center;
            gap: 16px;
          }
          .lab__stage {
            min-height: 360px;
          }
          .lab__sidebar {
            border-left: none;
            border-top: 1px solid #e5e5e5;
          }
          .lab__footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default DesignLabClient;


