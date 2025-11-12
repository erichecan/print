'use client';

/**
 * Design Lab Client
 * [2025-11-11 15:54:12] Fabric.js + Zustand 前端编辑器骨架，实现桌面编辑与移动端快速编辑
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { authApi, designLabApi, type DesignDraft, type DesignCanvasSnapshot } from '@/lib/api';
import { useDesignLabStore } from '@/contexts/designLabStore';

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

  const { draft, canvas, mode, mobileLocked } = useDesignLabStore((state) => ({
    draft: state.draft,
    canvas: state.canvas,
    mode: state.mode,
    mobileLocked: state.mobileLocked,
  }));
  const setDraft = useDesignLabStore((state) => state.setDraft);
  const patchDraft = useDesignLabStore((state) => state.patchDraft);
  const setCanvas = useDesignLabStore((state) => state.setCanvas);
  const undo = useDesignLabStore((state) => state.undo);
  const redo = useDesignLabStore((state) => state.redo);
  const setMode = useDesignLabStore((state) => state.setMode);
  const setMobileLocked = useDesignLabStore((state) => state.setMobileLocked);

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

  const ensureFabric = useCallback(async () => {
    if (fabricRef.current) {
      return fabricRef.current;
    }
    const fabricModule = await import('fabric');
    fabricRef.current = fabricModule.fabric;
    return fabricModule.fabric;
  }, []);

  const ensureObjectIds = useCallback(() => {
    const canvasInstance = fabricCanvasRef.current;
    if (!canvasInstance) {
      return;
    }
    canvasInstance.getObjects().forEach((obj) => {
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
        (o, object) => {
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
    } else {
      setActiveObjectId(null);
    }
  }, []);

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
          const response = await designLabApi.getDraft(designIdParam);
          draftData = response.data;
        } else if (variantIdParam) {
          const response = await designLabApi.createDraft({ productVariantId: variantIdParam });
          draftData = response.data;
          const nextParams = new URLSearchParams(params?.toString() || '');
          nextParams.set('designId', draftData.id);
          router.replace(`/design-lab?${nextParams.toString()}`);
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
      canvasInstance.on('object:added', handleCanvasChange);
      canvasInstance.on('object:modified', handleCanvasChange);
      canvasInstance.on('object:removed', handleCanvasChange);
      canvasInstance.on('selection:created', handleSelectionChange);
      canvasInstance.on('selection:updated', handleSelectionChange);
      canvasInstance.on('selection:cleared', handleSelectionChange);

      return () => {
        canvasInstance.off('object:added', handleCanvasChange);
        canvasInstance.off('object:modified', handleCanvasChange);
        canvasInstance.off('object:removed', handleCanvasChange);
        canvasInstance.off('selection:created', handleSelectionChange);
        canvasInstance.off('selection:updated', handleSelectionChange);
        canvasInstance.off('selection:cleared', handleSelectionChange);
      };
    };

    setupFabricEvents();
  }, [ensureFabric, handleCanvasChange, handleSelectionChange]);

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
        });
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
      const response = await designLabApi.updateDraft(draft.id, { name: designName.trim(), summary: 'Rename design' });
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
        });

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
          (img) => {
            if (img) {
              const imageObject = img as fabric.Image & { id?: string };
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
      const response = await designLabApi.requestQuote(draft.id, quantity);
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
      patchDraft(response.data.design);
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
      .map((obj) => obj as (fabric.Textbox & { id?: string }))
      .map((textbox) => ({
        id: textbox.id || uuidv4(),
        text: textbox.text || '',
      }));
  }, [canvas]);

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
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </nav>
        <main className="lab__stage">
          {mobileLocked && (
            <div className="lab__overlay">
              <p>移动端快速预览模式，请登录后在桌面端进行完整编辑。</p>
            </div>
          )}
          <canvas ref={canvasElementRef} width={canvas?.size?.width || 500} height={canvas?.size?.height || 600} />
        </main>
        <aside className="lab__sidebar">
          <h3>快速编辑</h3>
          {mode === 'preview' && (
            <p className="lab__hint">登录后可在移动端进行文字修改，或前往桌面端体验完整功能。</p>
          )}
          {mode !== 'preview' && textTargets.length === 0 && <p className="lab__hint">暂无可编辑文字对象，点击左侧“添加文字”开始创作。</p>}
          {mode !== 'preview' &&
            textTargets.map((target) => (
              <label key={target.id} className="lab__field">
                <span>文字块</span>
                <textarea
                  value={target.text}
                  onChange={(event) => handleQuickEditChange(target.id, event.target.value)}
                  disabled={mobileLocked}
                />
              </label>
            ))}
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
          padding: 24px;
          overflow-y: auto;
        }
        .lab__sidebar h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
        }
        .lab__hint {
          font-size: 14px;
          color: #777;
          line-height: 1.5;
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


