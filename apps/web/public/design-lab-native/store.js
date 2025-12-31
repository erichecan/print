/**
 * Store - 状态管理与数据持久化
* 管理设计稿状态、三面画布数据、产品信息
 */
(function() {
  'use strict';

// 数据 store 结构
  const PRODUCT_PAYLOAD_KEY = 'designLab:productPayload';

  const store = {
    currentSide: 'front', // 'front' | 'back' | 'sleeve'
designName: 'Untitled Design', // 设计名称
    sides: {
      front: { canvasJSON: null, thumbDataURL: null },
      back: { canvasJSON: null, thumbDataURL: null },
      sleeve: { canvasJSON: null, thumbDataURL: null }
    },
    product: {
      id: 'prod-001',
      name: 'Gildan Softstyle Jersey T-shirt',
      color: 'Heather Dark Grey',
      colors: ['Red', 'Heather Dark Grey', 'Navy', 'Black', 'White'],
      baseImages: {
        front: 'https://picsum.photos/seed/tshirt-front/900/700',
        back: 'https://picsum.photos/seed/tshirt-back/900/700',
        sleeve: 'https://picsum.photos/seed/tshirt-sleeve/900/700'
      },
      gallery: [],
variantId: null // 从 URL 参数获取的 variantId
    },
    version: '1.0.0',
    timestamp: null
  };
  
// 从 URL 参数初始化 variantId
// 如果 variantId 改变，清空之前商品的设计数据
  function initFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const variantId = urlParams.get('variantId');
    
// 从 localStorage 获取之前保存的 variantId（如果存在）
    let previousVariantId = null;
    try {
      const saved = localStorage.getItem('designLabStore');
      if (saved) {
        const parsed = JSON.parse(saved);
        previousVariantId = parsed.product?.variantId;
      }
    } catch (e) {
      console.warn('[Store] Failed to read previous variantId from localStorage:', e);
    }
    
    if (variantId) {
// 如果 variantId 改变了，清空之前商品的设计数据
      if (previousVariantId && previousVariantId !== variantId) {
        console.log('[Store] ⚠️ VariantId changed, clearing previous design data:', {
          previousVariantId,
          newVariantId: variantId
        });
        
// 先清空三面的画布数据
        store.sides = {
          front: { canvasJSON: null, thumbDataURL: null },
          back: { canvasJSON: null, thumbDataURL: null },
          sleeve: { canvasJSON: null, thumbDataURL: null }
        };
        
// 清空实际画布上的对象（如果已初始化）
        if (window.DesignLabCanvas && window.DesignLabCanvas.getCanvas) {
          const canvas = window.DesignLabCanvas.getCanvas();
          if (canvas) {
// 清空画布（保留背景会在 loadBackgroundForCurrentSide 中重新加载）
            canvas.clear();
            if (window.DesignLabCanvas.setBackgroundImage) {
              window.DesignLabCanvas.setBackgroundImage(null);
            }
          }
        }
        
// 清空所有面的历史栈（切换商品时需要清除所有面的历史）
        if (window.DesignLabHistory) {
          const store = window.DesignLabStore.getStore();
          const currentSideBefore = store.currentSide;
          
// 清除所有三个面的历史栈
          ['front', 'back', 'sleeve'].forEach(side => {
            if (typeof window.DesignLabHistory.switchSide === 'function') {
              window.DesignLabHistory.switchSide(side);
            }
            if (typeof window.DesignLabHistory.clearHistory === 'function') {
              window.DesignLabHistory.clearHistory();
            }
          });
          
// 切换回原来的面
          if (typeof window.DesignLabHistory.switchSide === 'function') {
            window.DesignLabHistory.switchSide(currentSideBefore || 'front');
          }
          
          console.log('[Store] ✅ All sides history stacks cleared for new variant');
        }
        
// 立即保存清空后的状态，覆盖 localStorage 中的旧数据
        store.product.variantId = variantId;
        saveToStorage();
        console.log('[Store] ✅ Previous design data cleared for new variant');
      } else {
        store.product.variantId = variantId;
      }
      
      console.log('[Store] variantId from URL:', variantId, {
        previousVariantId,
        changed: previousVariantId && previousVariantId !== variantId,
        timestamp: new Date().toISOString()
      });
    }
  }

// 从 localStorage 恢复状态
// 在加载前先检查 URL 中的 variantId，如果不同则不清空画布数据
  function loadFromStorage() {
    try {
// 先获取 URL 中的 variantId
      const urlParams = new URLSearchParams(window.location.search);
      const urlVariantId = urlParams.get('variantId');
      
      const saved = localStorage.getItem('designLabStore');
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedVariantId = parsed.product?.variantId;
        
// 如果 URL 中的 variantId 与保存的不同，清空画布数据
        if (urlVariantId && savedVariantId && urlVariantId !== savedVariantId) {
          console.log('[Store] ⚠️ VariantId mismatch, clearing previous design data:', {
            savedVariantId,
            urlVariantId
          });
          
// 清空画布数据，但保留其他设置
          parsed.sides = {
            front: { canvasJSON: null, thumbDataURL: null },
            back: { canvasJSON: null, thumbDataURL: null },
            sleeve: { canvasJSON: null, thumbDataURL: null }
          };
          
// 清空实际画布（如果已初始化）
          if (window.DesignLabCanvas && window.DesignLabCanvas.getCanvas) {
            const canvas = window.DesignLabCanvas.getCanvas();
            if (canvas) {
              canvas.clear();
              if (window.DesignLabCanvas.setBackgroundImage) {
                window.DesignLabCanvas.setBackgroundImage(null);
              }
            }
          }
          
// 清空历史栈
          if (window.DesignLabHistory && typeof window.DesignLabHistory.clearHistory === 'function') {
            window.DesignLabHistory.clearHistory();
          }
        }
        
        Object.assign(store, parsed);
        console.log('[Store] Loaded from localStorage', {
          variantId: store.product.variantId,
          urlVariantId,
          cleared: urlVariantId && savedVariantId && urlVariantId !== savedVariantId
        });
      }
    } catch (e) {
      console.warn('[Store] Failed to load from localStorage:', e);
    }
  }

// 保存状态到 localStorage
  function saveToStorage() {
    try {
      store.timestamp = new Date().toISOString();
      localStorage.setItem('designLabStore', JSON.stringify(store));
      console.log('[Store] Saved to localStorage');
    } catch (e) {
      console.warn('[Store] Failed to save to localStorage:', e);
    }
  }

// 从商品详情写入的 payload 中恢复产品信息
  function requestVisualRefresh() {
    if (window.DesignLabCanvas && window.DesignLabCanvas.loadBackgroundForCurrentSide) {
      window.DesignLabCanvas.loadBackgroundForCurrentSide();
      window.__DesignLabNeedsBackgroundRefresh = false;
    } else {
      window.__DesignLabNeedsBackgroundRefresh = true;
    }
    if (typeof window.updateProductInfo === 'function') {
      window.updateProductInfo();
    }
  }

  function hydrateProductFromPayload() {
    try {
      const payloadRaw = localStorage.getItem(PRODUCT_PAYLOAD_KEY);
      if (!payloadRaw) return;
      const payload = JSON.parse(payloadRaw);
      if (!payload || typeof payload !== 'object') return;

      const nextBaseImages = {
        front: payload.baseImages?.front || store.product.baseImages.front,
        back: payload.baseImages?.back || payload.baseImages?.front || store.product.baseImages.back,
        sleeve: payload.baseImages?.sleeve || payload.baseImages?.front || store.product.baseImages.sleeve,
      };

      store.product = {
        ...store.product,
        id: payload.productId || store.product.id,
        name: payload.productName || store.product.name,
        color: payload.color || store.product.color,
        colors: Array.isArray(payload.colors) && payload.colors.length ? payload.colors : store.product.colors,
        baseImages: nextBaseImages,
        variantId: payload.variantId || store.product.variantId,
        gallery: Array.isArray(payload.gallery) ? payload.gallery : store.product.gallery
      };

      saveToStorage();
      requestVisualRefresh();
      localStorage.removeItem(PRODUCT_PAYLOAD_KEY);
      console.log('[Store] Hydrated product from payload');
    } catch (e) {
      console.warn('[Store] Failed to hydrate product payload:', e);
    }
  }

  function needsVariantHydration() {
    const base = store.product.baseImages || {};
    const isPlaceholder =
      !base.front ||
      base.front.includes('picsum.photos') ||
      base.front.includes('hero-card-tee') ||
      base.front.includes('cat-tshirt.png');
    const needs = !!store.product.variantId && isPlaceholder;
    console.log('[Store] needsVariantHydration check:', {
      hasVariantId: !!store.product.variantId,
      isPlaceholder: isPlaceholder,
      baseFront: base.front,
      needs: needs
    });
    return needs;
  }

// 增强日志记录，用于调试图片尺寸和 API 调用
  async function hydrateProductFromVariantId() {
    const timestamp = new Date().toISOString();
    console.log('[Store] ===== hydrateProductFromVariantId START =====', { timestamp });
    
    if (!needsVariantHydration()) {
      console.log('[Store] Skipping hydration - not needed', { timestamp });
      return;
    }
    
    const variantId = store.product.variantId;
    if (!variantId) {
      console.warn('[Store] No variantId available for hydration', { 
        currentProduct: store.product,
        timestamp 
      });
      return;
    }

    console.log('[Store] Fetching product data for variantId:', {
      variantId,
      currentProduct: {
        id: store.product.id,
        name: store.product.name,
        color: store.product.color
      },
      timestamp
    });
    
    try {
      const apiUrl = `/api/products/variant/${variantId}`;
      console.log('[Store] API Request:', {
        url: apiUrl,
        method: 'GET',
        timestamp
      });
      
      const startTime = performance.now();
      const response = await fetch(apiUrl);
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      console.log('[Store] API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        duration: `${duration}ms`,
        headers: {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        },
        timestamp
      });
      
      if (!response.ok) {
// 静默处理 404 错误（variant 不存在是正常情况）
        if (response.status === 404) {
          console.debug('[Store] Variant not found (404):', variantId, '- This is normal if variant does not exist in database');
          return;
        }
        
// 处理 500 错误（后端服务可能未运行或有问题）
        if (response.status === 500) {
          console.warn('[Store] Server error (500):', variantId, '- Backend may not be running or has an error');
// 不阻止继续使用，使用默认产品数据
          return;
        }
        
// 只记录其他错误
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = errorText;
        }
        
        console.error('[Store] API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: apiUrl,
          timestamp
        });
        return;
      }
      
      const data = await response.json();
      console.log('[Store] API Success - Response Data:', {
        productId: data.productId,
        productName: data.productName,
        variantId: data.variantId,
        color: data.color,
        colors: data.colors,
        baseImages: data.baseImages,
        galleryCount: data.gallery?.length || 0,
        timestamp
      });
      
      if (!data) {
        console.warn('[Store] API returned empty data', { timestamp });
        return;
      }

      const previousProduct = { ...store.product };
      const previousVariantId = previousProduct.variantId;
      const newVariantId = data.variantId || store.product.variantId;
      
// 如果 variantId 改变了，清空之前商品的设计数据
      if (previousVariantId && newVariantId && previousVariantId !== newVariantId) {
        console.log('[Store] ⚠️ VariantId changed during hydration, clearing previous design data:', {
          previousVariantId,
          newVariantId
        });
        
// 先清空三面的画布数据
        store.sides = {
          front: { canvasJSON: null, thumbDataURL: null },
          back: { canvasJSON: null, thumbDataURL: null },
          sleeve: { canvasJSON: null, thumbDataURL: null }
        };
        
// 清空实际画布上的对象
        if (window.DesignLabCanvas && window.DesignLabCanvas.getCanvas) {
          const canvas = window.DesignLabCanvas.getCanvas();
          if (canvas) {
            canvas.clear();
            if (window.DesignLabCanvas.setBackgroundImage) {
              window.DesignLabCanvas.setBackgroundImage(null);
            }
          }
        }
        
// 清空历史栈（如果可用）
        if (window.DesignLabHistory && typeof window.DesignLabHistory.clearHistory === 'function') {
          window.DesignLabHistory.clearHistory();
        }
        
// 立即保存清空后的状态
        saveToStorage();
      }
      
      store.product = {
        ...store.product,
        id: data.productId || store.product.id,
        name: data.productName || store.product.name,
        color: data.color || store.product.color,
        colors: Array.isArray(data.colors) && data.colors.length ? data.colors : store.product.colors,
        baseImages: data.baseImages || store.product.baseImages,
        gallery: Array.isArray(data.gallery) ? data.gallery : store.product.gallery,
        variantId: newVariantId
      };

      console.log('[Store] Product Data Updated:', {
        previous: {
          id: previousProduct.id,
          name: previousProduct.name,
          baseImages: previousProduct.baseImages
        },
        current: {
          id: store.product.id,
          name: store.product.name,
          color: store.product.color,
          baseImages: store.product.baseImages,
          galleryCount: store.product.gallery?.length || 0
        },
        timestamp
      });

// 如果 variantId 改变了，需要重新加载背景
      const wasVariantChanged = previousVariantId && newVariantId && previousVariantId !== newVariantId;
      
      saveToStorage();
      
      if (wasVariantChanged) {
// 延迟重新加载背景，确保画布已更新
        setTimeout(() => {
          if (window.DesignLabCanvas && window.DesignLabCanvas.loadBackgroundForCurrentSide) {
            window.DesignLabCanvas.loadBackgroundForCurrentSide();
          }
// 重新加载当前面的数据（应该是空的）
          if (window.DesignLabCanvas && window.DesignLabCanvas.loadSide) {
            window.DesignLabCanvas.loadSide(store.currentSide);
          }
        }, 200);
      } else {
        requestVisualRefresh();
      }
      
      console.log('[Store] ===== hydrateProductFromVariantId SUCCESS =====', { timestamp });
    } catch (e) {
      console.error('[Store] Failed to hydrate product via API:', e);
      console.error('[Store] Error details:', e.message, e.stack);
    }
  }

// 获取当前面的画布数据
  function getCurrentSideData() {
    return store.sides[store.currentSide];
  }

// 设置当前面的画布数据
  function setCurrentSideData(canvasJSON, thumbDataURL) {
    store.sides[store.currentSide] = {
      canvasJSON: canvasJSON,
      thumbDataURL: thumbDataURL
    };
    saveToStorage();
  }

// 切换画布面
  function setActiveSide(side) {
    if (store.currentSide !== side && ['front', 'back', 'sleeve'].includes(side)) {
      console.log('[Store] side:', side);
      store.currentSide = side;
      saveToStorage();
      return true;
    }
    return false;
  }

// 设置产品颜色
  function setColor(color) {
    if (store.product.colors.includes(color)) {
      store.product.color = color;
      saveToStorage();
      console.log('[Store] Color changed to:', color);
      return true;
    }
    return false;
  }

// 导出完整设计数据
  function exportDesign() {
    return {
      version: store.version,
      timestamp: new Date().toISOString(),
      product: store.product,
      sides: store.sides
    };
  }

// 导入设计数据
  function importDesign(data) {
    if (data && data.sides && data.product) {
      store.sides = data.sides;
      store.product = data.product;
      if (data.currentSide) {
        store.currentSide = data.currentSide;
      }
      saveToStorage();
      console.log('[Store] Design imported');
      return true;
    }
    return false;
  }

// 清空所有数据
  function clearStore() {
    store.sides = {
      front: { canvasJSON: null, thumbDataURL: null },
      back: { canvasJSON: null, thumbDataURL: null },
      sleeve: { canvasJSON: null, thumbDataURL: null }
    };
    saveToStorage();
  }

// 初始化：从 localStorage 加载
// 先检查 URL 中的 variantId，如果改变了，先清空数据
  initFromURL();
// 然后加载保存的数据（如果 variantId 没变）
  loadFromStorage();
  hydrateProductFromPayload();
// 异步加载产品数据，确保在初始化完成后执行
  setTimeout(() => {
    hydrateProductFromVariantId();
  }, 100);

// 页面卸载前保存
  window.addEventListener('beforeunload', saveToStorage);

// 设置设计名称
  function setDesignName(name) {
    if (name && typeof name === 'string' && name.trim()) {
      store.designName = name.trim();
      saveToStorage();
      console.log('[Store] Design name updated:', store.designName);
      return true;
    }
    return false;
  }

// 获取设计名称
  function getDesignName() {
    return store.designName || 'Untitled Design';
  }

// 导出全局 API
  window.DesignLabStore = {
    getStore: () => ({ ...store }),
    getCurrentSide: () => store.currentSide,
    getCurrentSideData,
    setCurrentSideData,
    setActiveSide,
    setColor,
    getProduct: () => ({ ...store.product }),
setDesignName, // 导出设计名称设置函数
getDesignName, // 导出设计名称获取函数
    exportDesign,
    importDesign,
    clearStore,
    saveToStorage
  };
})();

