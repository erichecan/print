<!-- 2025-10-31 00:32:30 Style Guide extracted for CustomInk-like homepage replication -->

## Design Tokens

### Colors
- Primary (CTA): #FF6600
- Secondary (Top bar): #000000
- Background: #FFFFFF
- Text Primary: #333333
- Border/Divider: #E6E6E6
- Success: #28A745

### Typography
- Font Family: system-ui, -apple-system, sans-serif
- Weights: 300 (small), 400 (body), 500 (medium), 700 (heading), 800 (display)
- Sizes (mobile-first): 12, 14, 16, 18, 20, 24, 32, 40 px

### Spacing
- Container max width: 1200px; horizontal padding: 16px
- Scale: 12, 16, 24, 32, 48, 64 px

### Radius & Shadows
- Card Radius: 8px
- Card Shadow: 0 2px 8px rgba(0,0,0,0.1)

### Components
- Button Height: 44px (mobile), 48px (desktop)
- Input Border: 1px solid #ccc
- Focus Ring: 0 0 0 3px rgba(255,102,0,0.35)

### Motion
- Durations: standard 0.3s, fast 0.15s
- Easing: ease-out (enter), ease-in (exit)
- Hover Lift: translateY(-4px)
- Pressed Scale: 0.95

## Section Layouts
- Top Toolbar: height 40px, black background, right-aligned quick links
- Primary Nav: height 80px, sticky, logo left (~50px tall), centered menu, CTA right
- Hero: min-height ~500px, gradient background; content split ~60/40 on ≥768px; carousel media right
- Categories Grid: 8–12 cards; 1 col (mobile), 2 cols (tablet), 4 cols (desktop); hover lift + shadow deepen
- Testimonials: auto-rotate every 5s, star rating + avatar + timestamp

## Accessibility
- Semantic landmarks: header, nav, main, section, footer
- ARIA labels for toolbars, menus, carousels; update aria-expanded on toggles
- Visible focus via focus ring; adequate contrast for text and CTAs

## Performance
- Preload LCP hero image
- IntersectionObserver lazy-load for offscreen images
- Debounced scroll handlers; CSS transforms for animations

## References
- Homepage structure and copy inspired by [CustomInk](https://www.customink.com/)


