# Assets Deployment Guide

## Overview

This guide covers the deployment of static assets, particularly category images, across different hosting environments (GitHub, Netlify, GCP).

## Asset Structure

### Current File Organization

```
apps/web/public/assets/
├── categories/
│   ├── cat-activewear.png      (99.11 KB)
│   ├── cat-bag.png            (366.22 KB)
│   ├── cat-drinkware.png       (181.27 KB)
│   ├── cat-hat.png            (388.67 KB)
│   ├── cat-jacket-vest.png     (550.94 KB)
│   ├── cat-office.png          (88.47 KB)
│   ├── cat-polo-business.png   (104.4 KB)
│   ├── cat-sweatshirt.png     (125.19 KB)
│   ├── cat-tech.png           (76.79 KB)
│   ├── cat-trade-show.png      (53.36 KB)
│   ├── cat-tshirt.png         (171.45 KB)
│   └── cat-workwear.png       (280.32 KB)
├── brands/                    # Brand logos and SVGs
├── hero/                      # Hero section images
└── logo.svg                   # Site logo
```

### Image Specifications

- **Format**: PNG (with alpha transparency support)
- **Naming Convention**: `cat-{category-slug}.png`
- **Size**: Optimized for web (average 100-400 KB per image)
- **Aspect Ratio**: Square (1:1) for consistent card layout
- **Resolution**: Web-optimized (72-150 DPI)

## Path References in Code

### Frontend Components

All image paths use absolute paths from the public directory:

```tsx
// Correct path format
const imagePath = '/assets/categories/cat-tshirt.png';

// Next.js Image component usage
<Image
  src={imagePath}
  alt={category.name}
  width={300}
  height={300}
  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
/>
```

### Database Integration

Categories in the database can have their `imageUrl` field set:

```sql
UPDATE categories 
SET image_url = '/assets/categories/cat-tshirt.png' 
WHERE slug = 't-shirts';
```

## GitHub Repository

### Commit Strategy

1. **Include All Assets**: All images are tracked in the repository
2. **LFS Consideration**: For very large images (>10MB), consider Git LFS
3. **File Size**: Current total size ~2.4MB (well within GitHub limits)

### .gitignore Configuration

```
# Don't ignore our category images
!public/assets/categories/*.png

# But ignore development artifacts
public/assets/categories/*.tmp
public/assets/categories/*.backup
```

### Branch Strategy

- **main**: Production-ready assets
- **develop**: Latest assets under development
- **feature/***: Feature-specific assets

## Netlify Deployment

### Build Configuration

`netlify.toml` configuration for static assets:

```toml
[build]
  publish = "apps/web/.next"
  
[[redirects]]
  from = "/assets/*"
  to = "/assets/:splat"
  status = 200

[[headers]]
  for = "/assets/categories/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    X-Content-Type-Options = "nosniff"
```

### CDN Optimization

Netlify automatically provides:
- **Global CDN**: Assets distributed across edge locations
- **HTTP/2**: Multiplexed asset loading
- **Compression**: Gzip/Brotli compression
- **Cache Headers**: Long-term caching for static assets

### Build Process

```json
{
  "scripts": {
    "build": "next build",
    "export": "next export",
    "deploy": "npm run build && netlify deploy --prod --dir=apps/web/out"
  }
}
```

### Environment Variables

```bash
# Netlify environment variables
NEXT_PUBLIC_ASSETS_URL=/assets/
NODE_ENV=production
```

## GCP Deployment

### Cloud Storage Integration

For GCP deployments with Cloud Storage:

#### Option 1: Static Asset Hosting

```javascript
// next.config.js
const isGCP = process.env.GCP_DEPLOY === 'true';

module.exports = {
  images: {
    loader: isGCP ? 'custom' : 'default',
    loaderFile: isGCP ? './image-loader-gcp.js' : undefined,
  },
  assetPrefix: isGCP ? 'https://storage.googleapis.com/your-bucket/assets' : undefined,
};
```

#### Option 2: Embedded Assets

Keep assets embedded in the build (recommended for category images):

```javascript
// next.config.js
module.exports = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true, // For static export
  },
};
```

### CDN Configuration

If using GCP CDN:

```yaml
# cloud-storage.yaml
apiVersion: storage.cnrm.cloud.google.com/v1beta1
kind: StorageBucket
metadata:
  name: my-app-assets
spec:
  location: US
  storageClass: STANDARD
  uniformBucketLevelAccess: true
  cors:
  - origin: ["*"]
    method: ["GET", "HEAD"]
    responseHeader: ["Content-Type"]
    maxAgeSeconds: 3600
```

## Cross-Platform Compatibility

### Path Resolution

```tsx
// Universal path resolver (works across all platforms)
const getAssetPath = (filename: string): string => {
  const basePath = process.env.NEXT_PUBLIC_ASSETS_URL || '/assets';
  return `${basePath}/categories/${filename}`;
};

// Usage
const imagePath = getAssetPath('cat-tshirt.png');
```

### Environment Detection

```tsx
// Platform-specific optimizations
const isNetlify = process.env.NETLIFY === 'true';
const isGCP = process.env.GCP_DEPLOY === 'true';
const isLocal = process.env.NODE_ENV === 'development';

const getOptimizedSrc = (src: string) => {
  if (isGCP) {
    return `https://storage.googleapis.com/your-bucket${src}`;
  }
  return src; // Netlify and local use standard paths
};
```

## Performance Optimization

### Image Optimization Strategies

1. **Next.js Image Component**: Automatic optimization
2. **Responsive Images**: Multiple sizes for different devices
3. **Lazy Loading**: Images load as needed
4. **WebP Support**: Convert to WebP when supported

```tsx
// Optimized image component
<Image
  src={imagePath}
  alt={category.name}
  width={300}
  height={300}
  sizes="(max-width: 768px) 50vw, 25vw"
  priority={index < 4} // Load first 4 images with priority
/>
```

### Cache Strategy

```javascript
// Service worker for offline support (optional)
const CACHE_NAME = 'category-images-v1';
const CATEGORIES_URL = '/assets/categories/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/assets/categories/cat-tshirt.png',
        '/assets/categories/cat-sweatshirt.png',
        // ... other category images
      ]);
    })
  );
});
```

## Monitoring and Maintenance

### Asset Performance Monitoring

```javascript
// Image loading performance tracking
const trackImageLoad = (imageName: string, loadTime: number) => {
  if (window.gtag) {
    window.gtag('event', 'image_load', {
      image_name: imageName,
      load_time: loadTime,
      custom_map: { custom_parameter_1: 'asset_performance' }
    });
  }
};
```

### Regular Maintenance Tasks

1. **Image Optimization**: Run image compression quarterly
2. **Format Updates**: Consider WebP/AVIF support
3. **Size Monitoring**: Track total asset bundle size
4. **CDN Performance**: Monitor cache hit rates

## Troubleshooting

### Common Issues

#### 404 Errors on Images
- Check file paths in code vs actual file locations
- Verify build output includes all assets
- Confirm CDN configuration for production

#### Slow Loading Images
- Implement proper lazy loading
- Check image file sizes
- Verify CDN cache headers

#### Cross-Origin Issues
- Ensure proper CORS configuration
- Check asset prefix in Next.js config
- Verify environment-specific paths

### Debug Commands

```bash
# Check if files exist in build output
find apps/web/.next -name "*.png" -type f

# Test asset loading locally
curl -I http://localhost:3000/assets/categories/cat-tshirt.png

# Verify Netlify deployment
curl -I https://your-site.netlify.app/assets/categories/cat-tshirt.png

# Check GCP deployment
gsutil ls gs://your-bucket/assets/categories/
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-19  
**Maintainer**: DevOps Team