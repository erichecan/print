// [2025-11-02 22:13:00] Content Manager JavaScript
/**
 * Content Manager
 * Manages non-product images through JSON configuration
 */

class ContentManager {
  constructor() {
    this.config = null;
    this.originalConfig = null;
  }

  /**
   * Load configuration
   */
  async loadConfig() {
    try {
      const response = await fetch('/assets/content-config.json');
      this.config = await response.json();
      this.originalConfig = JSON.parse(JSON.stringify(this.config)); // Deep copy
      return this.config;
    } catch (error) {
      console.error('Failed to load config:', error);
      alert('Failed to load configuration. Please refresh the page.');
      return null;
    }
  }

  /**
   * Save configuration to JSON file
   * Note: In a real implementation, this would send to backend API
   * For now, we'll show the JSON for manual save
   */
  async saveConfig() {
    if (!this.config) {
      alert('No configuration loaded');
      return;
    }

    // In production, this would POST to /api/admin/content/update
    // For now, display JSON for manual copy/paste
    const jsonString = JSON.stringify(this.config, null, 2);
    
    // Create download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content-config.json';
    a.click();
    URL.revokeObjectURL(url);

    alert('Configuration JSON downloaded. Please replace assets/content-config.json with this file.');
  }

  /**
   * Update image in config
   */
  updateImage(category, key, url) {
    if (!this.config[category]) {
      this.config[category] = {};
    }
    if (!this.config[category][key]) {
      this.config[category][key] = {};
    }
    this.config[category][key].local = url;
    this.config[category][key].url = url; // Update both for consistency
  }

  /**
   * Handle file upload
   * [2025-11-02 22:20:00] Enhanced file upload with automatic download and path update
   */
  async handleFileUpload(category, key, file) {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP, SVG)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB. Please compress the image first.');
      return;
    }

    // Show loading state
    const preview = document.querySelector(`.image-preview[data-category="${category}"][data-key="${key}"]`);
    if (preview) {
      preview.innerHTML = '<div class="placeholder-preview">Loading...</div>';
    }

    // Read file as data URL for preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageDataUrl = e.target.result;
      
      // Show preview
      if (preview) {
        preview.innerHTML = `
          <img src="${imageDataUrl}" alt="Preview" style="max-width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
          <div class="upload-overlay" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
            ✓ Uploaded
          </div>
        `;
      }

      // Generate file name based on category and key
      const fileExtension = file.name.split('.').pop() || 'jpg';
      let fileName = '';
      
      if (category === 'hero') {
        const heroNames = {
          'tee': 'hero-card-tee',
          'bottle': 'hero-card-bottle',
          'hat': 'hero-card-hat',
          'bag': 'hero-card-bag'
        };
        fileName = `${heroNames[key] || key}.${fileExtension}`;
      } else if (category === 'brands') {
        fileName = `${key.replace(/-/g, '-')}.${fileExtension}`;
      } else if (category === 'categories') {
        fileName = `cat-${key.replace(/-/g, '-')}.${fileExtension}`;
      } else {
        fileName = file.name;
      }

      // Determine target directory
      const targetDir = category === 'hero' ? 'hero' : category === 'brands' ? 'brands' : category === 'categories' ? 'categories' : 'images';
      const filePath = `/assets/${targetDir}/${fileName}`;

      // Update URL input
      const urlInput = document.querySelector(`.image-url[data-category="${category}"][data-key="${key}"]`);
      if (urlInput) {
        urlInput.value = filePath;
      }

      // Auto-update config
      this.updateImage(category, key, filePath);

      // Create download button for user to save the file
      await this.downloadImageFile(file, fileName, targetDir);
    };
    
    reader.onerror = () => {
      alert('Failed to read image file. Please try again.');
      if (preview) {
        preview.innerHTML = '<div class="placeholder-preview">Upload Failed</div>';
      }
    };

    reader.readAsDataURL(file);
  }

  /**
   * Download image file to user's download folder
   * [2025-11-02 22:20:00] Helper function to save uploaded image
   */
  async downloadImageFile(file, fileName, targetDir) {
    // Create a download link
    const blob = file;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show instruction modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    modal.innerHTML = `
      <div style="background: white; padding: 24px; border-radius: 8px; max-width: 500px; margin: 20px;">
        <h3 style="margin: 0 0 16px; font-size: 20px;">✅ 图片已准备下载</h3>
        <p style="margin: 0 0 12px; color: #666;">
          <strong>${fileName}</strong> 已添加到下载列表。
        </p>
        <ol style="margin: 0 0 20px; padding-left: 20px; color: #666; line-height: 1.8;">
          <li>将下载的图片文件移动到：<br><code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px;">assets/${targetDir}/</code></li>
          <li>确保文件名为：<strong>${fileName}</strong></li>
          <li>点击下方"保存配置"按钮保存更改</li>
        </ol>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button onclick="this.closest('div').remove(); this.closest('div').remove();" 
                  style="padding: 10px 20px; background: #f5f5f5; border: none; border-radius: 6px; cursor: pointer;">
            我知道了
          </button>
          <button onclick="saveAllChanges(); this.closest('div').remove(); this.closest('div').remove();" 
                  style="padding: 10px 20px; background: #FF1F3D; color: white; border: none; border-radius: 6px; cursor: pointer;">
            保存配置
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto close after 10 seconds
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 10000);
  }

  /**
   * Render brand logos section
   */
  renderBrandLogos() {
    const container = document.getElementById('brand-logos');
    if (!container || !this.config?.brands) return;

    const brands = this.config.brands;
    const brandOrder = ['nike', 'carhartt', 'new-era', 'north-face', 'stanley', 'patagonia', 'champion', 'adidas', 'columbia', 'hydro-flask'];

    container.innerHTML = brandOrder.map(key => {
      const brand = brands[key];
      if (!brand) return '';

      return `
        <div class="image-item">
          <label>${brand.alt || key}</label>
          <div class="image-preview" data-category="brands" data-key="${key}" style="position: relative;">
            <img src="${brand.url}" alt="${brand.alt}" style="max-width: 100%; height: auto;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'placeholder-preview\\'>点击上传</div><input type=\\'file\\' accept=\\'image/*\\' class=\\'image-input\\' data-category=\\'brands\\' data-key=\\'${key}\\'>">
            <input type="file" accept="image/*" class="image-input" data-category="brands" data-key="${key}">
          </div>
          <div class="image-info">
            <input type="text" class="image-url" value="${brand.url}" data-category="brands" data-key="${key}">
            <button class="btn btn-sm" onclick="contentManager.updateImage('brands', '${key}', document.querySelector('.image-url[data-category=\\'brands\\'][data-key=\\'${key}\\']').value); saveAllChanges();">Update</button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render category images section
   */
  renderCategoryImages() {
    const container = document.getElementById('category-images');
    if (!container || !this.config?.categories) return;

    const categories = this.config.categories;

    container.innerHTML = Object.entries(categories).map(([key, cat]) => {
      return `
        <div class="image-item">
          <label>${cat.alt || key}</label>
          <div class="image-preview" data-category="categories" data-key="${key}" style="position: relative;">
            <img src="${cat.url}" alt="${cat.alt}" style="max-width: 100%; height: auto;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'placeholder-preview\\'>点击上传</div><input type=\\'file\\' accept=\\'image/*\\' class=\\'image-input\\' data-category=\\'categories\\' data-key=\\'${key}\\'>">
            <input type="file" accept="image/*" class="image-input" data-category="categories" data-key="${key}">
          </div>
          <div class="image-info">
            <input type="text" class="image-url" value="${cat.url}" data-category="categories" data-key="${key}">
            <button class="btn btn-sm" onclick="contentManager.updateImage('categories', '${key}', document.querySelector('.image-url[data-category=\\'categories\\'][data-key=\\'${key}\\']').value); saveAllChanges();">Update</button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Initialize content manager
   */
  async init() {
    await this.loadConfig();
    if (this.config) {
      this.renderBrandLogos();
      this.renderCategoryImages();
      // Wait a bit for DOM to update
      setTimeout(() => {
        this.setupEventListeners();
      }, 100);
    }
  }

  /**
   * Setup event listeners
   * [2025-11-02 22:20:00] Enhanced to handle dynamically generated content
   */
  setupEventListeners() {
    // Remove existing listeners to avoid duplicates
    const existingInputs = document.querySelectorAll('.image-input');
    existingInputs.forEach(input => {
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);
    });

    // File input handlers - use event delegation for dynamic content
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('image-input')) {
        const category = e.target.dataset.category;
        const key = e.target.dataset.key;
        const file = e.target.files[0];
        if (file) {
          this.handleFileUpload(category, key, file);
        }
      }
    });

    // Also bind directly to existing inputs
    document.querySelectorAll('.image-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const category = e.target.dataset.category;
        const key = e.target.dataset.key;
        const file = e.target.files[0];
        if (file) {
          this.handleFileUpload(category, key, file);
        }
      });
    });
  }
}

// Global functions
async function updateImage(category, key) {
  const urlInput = document.querySelector(`.image-url[data-category="${category}"][data-key="${key}"]`);
  if (!urlInput || !urlInput.value) {
    alert('Please enter an image URL');
    return;
  }
  
  if (!window.contentManager) {
    alert('Content manager not initialized');
    return;
  }

  window.contentManager.updateImage(category, key, urlInput.value);
  
  // Update preview
  const preview = document.querySelector(`.image-preview[data-category="${category}"][data-key="${key}"]`);
  if (preview) {
    preview.innerHTML = `<img src="${urlInput.value}" alt="Preview" style="max-width: 100%; height: auto; border-radius: 8px;">`;
  }
}

async function saveAllChanges() {
  if (!window.contentManager) {
    alert('Content manager not initialized');
    return;
  }
  
  await window.contentManager.saveConfig();
}

async function reloadConfig() {
  if (!window.contentManager) {
    alert('Content manager not initialized');
    return;
  }
  
  await window.contentManager.init();
  alert('Configuration reloaded');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  window.contentManager = new ContentManager();
  window.contentManager.init();
});

