// Image loader - Dynamically load images from JSON config
/**
 * Image Loader
 * Loads images dynamically from content-config.json
 * Falls back to placeholder if image fails to load
 */

class ImageLoader {
  constructor() {
    this.config = null;
    this.useLocal = true; // Set to false to use Unsplash URLs temporarily
  }

  /**
   * Load content configuration
   */
  async loadConfig() {
    try {
      const response = await fetch('/assets/content-config.json');
      this.config = await response.json();
      return this.config;
    } catch (error) {
      console.error('Failed to load image config:', error);
      return null;
    }
  }

  /**
   * Get image URL from config
   */
  getImageUrl(category, key) {
    if (!this.config) return null;
    
    const item = this.config[category]?.[key];
    if (!item) return null;

    // Use local path if available and useLocal is true, otherwise use remote URL
    if (this.useLocal && item.local) {
      return item.local;
    }
    return item.url || item.local;
  }

  /**
   * Load image for element
   */
  async loadImage(element, category, key, fallbackToPlaceholder = true) {
    const url = this.getImageUrl(category, key);
    
    if (!url) {
      if (fallbackToPlaceholder) {
        element.classList.add('placeholder');
      }
      return false;
    }

    try {
      // Remove placeholder class
      element.classList.remove('placeholder');

      if (element.tagName === 'IMG') {
        element.src = url;
        if (this.config[category]?.[key]?.alt) {
          element.alt = this.config[category][key].alt;
        }
      } else if (element.tagName === 'DIV' || element.tagName === 'A' || element.tagName === 'BUTTON') {
        // For div/button elements, set background image
        element.style.backgroundImage = `url(${url})`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
        element.style.backgroundRepeat = 'no-repeat';
      }

      return true;
    } catch (error) {
      console.error(`Failed to load image ${category}/${key}:`, error);
      if (fallbackToPlaceholder) {
        element.classList.add('placeholder');
      }
      return false;
    }
  }

  /**
   * Load hero images
   */
  async loadHeroImages() {
    const heroCards = document.querySelectorAll('.hero__card.placeholder');
    if (heroCards.length === 0) return;

    await this.loadConfig();
    
    const mappings = [
      { index: 0, key: 'tee' },
      { index: 1, key: 'bottle' },
      { index: 2, key: 'hat' },
      { index: 3, key: 'bag' }
    ];

    mappings.forEach(mapping => {
      if (heroCards[mapping.index]) {
        this.loadImage(heroCards[mapping.index], 'hero', mapping.key);
      }
    });
  }

  /**
   * Load brand logos
   */
  async loadBrandLogos() {
    const brandLogos = document.querySelectorAll('.brandlogo.placeholder');
    if (brandLogos.length === 0) return;

    await this.loadConfig();

    const brandOrder = [
      'nike',
      'carhartt',
      'new-era',
      'north-face',
      'stanley',
      'patagonia',
      'champion',
      'adidas',
      'columbia',
      'hydro-flask'
    ];

    brandLogos.forEach((logo, index) => {
      const brandKey = brandOrder[index];
      if (brandKey) {
        const url = this.getImageUrl('brands', brandKey);
        if (url) {
          logo.classList.remove('placeholder');
          logo.innerHTML = `<img src="${url}" alt="${this.config.brands[brandKey]?.alt || brandKey}" style="max-width: 100%; height: auto;">`;
        }
      }
    });
  }

  /**
   * Load product images
   */
  async loadProductImages() {
    await this.loadConfig();

    // Product list images
    const productImages = document.querySelectorAll('.product__image.placeholder');
    productImages.forEach((img, index) => {
      const productKey = `prod-00${index + 1}`;
      const url = this.getImageUrl('products', productKey);
      if (url) {
        img.classList.remove('placeholder');
        img.style.backgroundImage = `url(${url})`;
        img.style.backgroundSize = 'cover';
        img.style.backgroundPosition = 'center';
      }
    });

    // Product detail gallery
    const galleryStage = document.querySelector('.gallery__stage.placeholder');
    if (galleryStage) {
      const url = this.getImageUrl('products', 'hoodie-front');
      if (url) {
        galleryStage.classList.remove('placeholder');
        galleryStage.style.backgroundImage = `url(${url})`;
        galleryStage.style.backgroundSize = 'cover';
        galleryStage.style.backgroundPosition = 'center';
      }
    }

    const galleryThumbs = document.querySelectorAll('.gallery__thumbs .thumb.placeholder');
    const thumbKeys = ['hoodie-front', 'hoodie-back', 'hoodie-detail'];
    galleryThumbs.forEach((thumb, index) => {
      const key = thumbKeys[index];
      if (key) {
        const url = this.getImageUrl('products', key);
        if (url) {
          thumb.classList.remove('placeholder');
          thumb.style.backgroundImage = `url(${url})`;
          thumb.style.backgroundSize = 'cover';
          thumb.style.backgroundPosition = 'center';
        }
      }
    });
  }
}

// Initialize image loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const imageLoader = new ImageLoader();
  
  // Load images based on current page
  const path = window.location.pathname;
  
  if (path.includes('home.html') || path === '/' || path.includes('index.html')) {
    imageLoader.loadHeroImages();
    imageLoader.loadBrandLogos();
  }
  
  if (path.includes('long-sleeve.html')) {
    imageLoader.loadProductImages();
  }
  
  if (path.includes('product-hoodie.html')) {
    imageLoader.loadProductImages();
  }

  // Make available globally for manual use
  window.imageLoader = imageLoader;
});

