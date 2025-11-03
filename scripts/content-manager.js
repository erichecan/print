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
   */
  async handleFileUpload(category, key, file) {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.querySelector(`.image-preview[data-category="${category}"][data-key="${key}"]`);
      if (preview) {
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; height: auto; border-radius: 8px;">`;
      }
    };
    reader.readAsDataURL(file);

    // In production, upload to server via API
    // For now, show instruction
    const fileName = file.name;
    const suggestedPath = `/assets/${category === 'hero' ? 'hero' : category === 'brands' ? 'brands' : 'categories'}/${fileName}`;
    
    // Update the URL input
    const urlInput = document.querySelector(`.image-url[data-category="${category}"][data-key="${key}"]`);
    if (urlInput) {
      urlInput.value = suggestedPath;
    }

    alert(`File selected: ${fileName}\n\nPlease:\n1. Save the file to: assets/${category === 'hero' ? 'hero' : category === 'brands' ? 'brands' : 'categories'}/\n2. Click "Update" to save the path`);
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
          <div class="image-preview" data-category="brands" data-key="${key}">
            <img src="${brand.url}" alt="${brand.alt}" style="max-width: 100%; height: auto;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'placeholder-preview\\'>Preview</div>'">
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
          <div class="image-preview" data-category="categories" data-key="${key}">
            <img src="${cat.url}" alt="${cat.alt}" style="max-width: 100%; height: auto;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'placeholder-preview\\'>Preview</div>'">
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
      this.setupEventListeners();
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // File input handlers
    document.querySelectorAll('.image-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const category = e.target.dataset.category;
        const key = e.target.dataset.key;
        this.handleFileUpload(category, key, e.target.files[0]);
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

