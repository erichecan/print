/**
 * Art Assets Loader - CMS 素材库加载器
 * [2025-01-28 04:15:00] 从后端 API 获取 CMS 素材库并显示在 art 面板中
 */
(function() {
  'use strict';

  const API_BASE_URL = 'http://localhost:3001/api';
  let artAssetsCache = null;
  let loadingArtAssets = false;

  // [2025-01-28 04:15:00] 从 API 获取所有素材
  async function fetchArtAssets() {
    if (loadingArtAssets) {
      console.log('[ArtAssetsLoader] Already loading, waiting...');
      return artAssetsCache;
    }

    if (artAssetsCache) {
      console.log('[ArtAssetsLoader] Using cached art assets');
      return artAssetsCache;
    }

    loadingArtAssets = true;
    console.log('[ArtAssetsLoader] ===== Fetching art assets from API =====');

    try {
      const response = await fetch(`${API_BASE_URL}/art-assets`).catch(error => {
        // [2025-01-27] 处理网络错误（后端服务可能未运行）
        console.warn('[ArtAssetsLoader] Network error (backend may not be running):', error);
        return null;
      });
      
      if (!response) {
        console.warn('[ArtAssetsLoader] Failed to fetch art assets - backend may not be running');
        return {};
      }
      
      if (!response.ok) {
        // [2025-01-27] 静默处理错误，不阻止应用继续运行
        console.warn('[ArtAssetsLoader] HTTP error:', response.status, '- Continuing without art assets');
        return {};
      }

      const data = await response.json();
      console.log('[ArtAssetsLoader] ✅ API Response:', {
        success: data.success,
        categoriesCount: data.data ? Object.keys(data.data).length : 0,
        timestamp: new Date().toISOString()
      });

      if (data.success && data.data) {
        artAssetsCache = data.data;
        console.log('[ArtAssetsLoader] ✅ Art assets loaded:', {
          categories: Object.keys(artAssetsCache),
          totalAssets: Object.values(artAssetsCache).reduce((sum, arr) => sum + arr.length, 0),
          timestamp: new Date().toISOString()
        });
        return artAssetsCache;
      } else {
        console.warn('[ArtAssetsLoader] ⚠️ API returned no data');
        return {};
      }
    } catch (error) {
      console.error('[ArtAssetsLoader] ❌ Error fetching art assets:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return {};
    } finally {
      loadingArtAssets = false;
    }
  }

  // [2025-01-28 04:15:00] 渲染 CMS 素材到 art 面板
  function renderArtAssets(artAssets) {
    const artGrid = document.querySelector('.panel[data-panel="art"] .panel__art-grid');
    if (!artGrid) {
      console.warn('[ArtAssetsLoader] ⚠️ Art grid not found');
      return;
    }

    console.log('[ArtAssetsLoader] ===== Rendering art assets =====', {
      categories: Object.keys(artAssets),
      timestamp: new Date().toISOString()
    });

    // [2025-01-28 04:15:00] 清空现有内容（保留基本形状按钮）
    const existingButtons = artGrid.querySelectorAll('.panel__art-item[data-art]');
    existingButtons.forEach(btn => {
      const artType = btn.getAttribute('data-art');
      // 保留基本形状（star, heart, circle, triangle, square）
      if (!['star', 'heart', 'circle', 'triangle', 'square'].includes(artType)) {
        btn.remove();
      }
    });

    // [2025-01-28 04:15:00] 按分类渲染素材
    Object.keys(artAssets).forEach(category => {
      const assets = artAssets[category];
      if (!Array.isArray(assets) || assets.length === 0) {
        return;
      }

      console.log('[ArtAssetsLoader] Rendering category:', {
        category,
        assetCount: assets.length,
        timestamp: new Date().toISOString()
      });

      // [2025-01-28 04:15:00] 创建分类标题（可选）
      // 如果需要显示分类标题，可以在这里添加

      // [2025-01-28 04:15:00] 渲染每个素材
      assets.forEach(asset => {
        const imageUrl = asset.imageUrl || asset.image_url;
        if (!imageUrl) {
          console.warn('[ArtAssetsLoader] ⚠️ Asset missing image URL:', asset);
          return;
        }

        const button = document.createElement('button');
        button.className = 'panel__art-item';
        button.setAttribute('data-art-url', imageUrl);
        button.setAttribute('data-art-name', asset.name || 'Art');
        button.setAttribute('aria-label', asset.name || 'Art');
        button.setAttribute('title', asset.name || 'Art');

        // [2025-01-28 04:15:00] 创建图片元素
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = asset.name || 'Art';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.borderRadius = '4px';

        // [2025-01-28 04:15:00] 图片加载错误处理
        img.onerror = () => {
          console.error('[ArtAssetsLoader] ❌ Failed to load image:', {
            url: imageUrl,
            assetName: asset.name,
            timestamp: new Date().toISOString()
          });
          // 显示占位符
          img.style.display = 'none';
          button.innerHTML = '<span style="font-size: 24px;">🖼️</span>';
        };

        img.onload = () => {
          console.log('[ArtAssetsLoader] ✅ Image loaded:', {
            url: imageUrl,
            assetName: asset.name,
            timestamp: new Date().toISOString()
          });
        };

        button.appendChild(img);
        artGrid.appendChild(button);

        // [2025-01-28 04:15:00] 绑定点击事件
        // [2025-01-28 04:20:00] 使用 toolbar 的 addArt 函数以保持一致性
        button.addEventListener('click', () => {
          console.log('[ArtAssetsLoader] 📋 Art asset clicked:', {
            name: asset.name,
            url: imageUrl,
            timestamp: new Date().toISOString()
          });

          // [2025-01-28 04:20:00] 使用 toolbar 的 addArt 函数（支持 URL）
          if (window.DesignLabToolbar && window.DesignLabToolbar.addArt) {
            window.DesignLabToolbar.addArt(imageUrl);
          } else if (window.DesignLabCanvas && window.DesignLabCanvas.addImage) {
            // [2025-01-28 04:15:00] 降级方案：直接调用 canvasManager
            window.DesignLabCanvas.addImage(imageUrl);
            
            // [2025-01-27] 历史已在 addImage 中添加前保存，这里不需要重复保存
            
            // [2025-01-28 04:15:00] 返回 home 面板
            if (window.DesignLabPanel) {
              window.DesignLabPanel.openPanel('home');
            }
          } else {
            console.error('[ArtAssetsLoader] ❌ DesignLabCanvas.addImage not available');
          }
        });
      });
    });

    console.log('[ArtAssetsLoader] ✅ Art assets rendered', {
      totalButtons: artGrid.querySelectorAll('.panel__art-item').length,
      timestamp: new Date().toISOString()
    });
  }

  // [2025-01-28 04:15:00] 初始化：加载并渲染素材
  async function init() {
    console.log('[ArtAssetsLoader] ===== INITIALIZING =====', {
      timestamp: new Date().toISOString()
    });

    try {
      const artAssets = await fetchArtAssets();
      if (artAssets && Object.keys(artAssets).length > 0) {
        renderArtAssets(artAssets);
      } else {
        console.log('[ArtAssetsLoader] ⚠️ No art assets to render');
      }
    } catch (error) {
      console.error('[ArtAssetsLoader] ❌ Initialization error:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  // [2025-01-28 04:15:00] 导出全局 API
  window.DesignLabArtAssetsLoader = {
    init,
    fetchArtAssets,
    renderArtAssets,
    clearCache: () => {
      artAssetsCache = null;
      console.log('[ArtAssetsLoader] Cache cleared');
    }
  };

  // [2025-01-28 04:15:00] DOM 加载完成后自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM 已经加载完成，延迟一点确保其他模块已初始化
    setTimeout(init, 500);
  }
})();

