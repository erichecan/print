# Visual CSS Check Guide
**Updated: 2025-11-01 00:00:00 - Full theme migration from green to brand red (#FF1F3D)**

## Quick Method (Python HTTP Server + Browser)

### Step 1: Start Local Server
```bash
python -m http.server 8080
```

### Step 2: Open Pages in Browser
Navigate to: `http://localhost:8080/[page].html`

### Pages to Check:
- `http://localhost:8080/home.html` ✓
- `http://localhost:8080/long-sleeve.html` ✓
- `http://localhost:8080/product-hoodie.html` ✓
- `http://localhost:8080/design-lab.html` ✓
- `http://localhost:8080/cart.html` ✓ (Fixed: button alignment)
- `http://localhost:8080/checkout.html` ✓
- `http://localhost:8080/order-confirmation.html` ✓ (Fixed: button alignment)
- `http://localhost:8080/account.html` ✓
- `http://localhost:8080/help.html` ✓
- `http://localhost:8080/ndx-welcome.html` ✓

### Step 3: Visual Checklist Per Page

**home.html**
- [ ] Topbar black bar with white links
- [ ] Logo green gradient with "suvernire plus"
- [ ] Hero section gradient background
- [ ] Category cards with images (64x64)
- [ ] Brand logos in grayscale → color on hover
- [ ] Testimonials 3-column grid
- [ ] B2B section 2-column layout
- [ ] Footer dark with light text

**long-sleeve.html**
- [ ] Filters sidebar sticky (280px width)
- [ ] Product grid 3 columns
- [ ] Filter buttons toggle green outline
- [ ] Color swatches circular with green accent
- [ ] Size chips pill-shaped
- [ ] Pagination buttons

**product-hoodie.html**
- [ ] Gallery stage + thumbs
- [ ] Rating summary stars (yellow/gold)
- [ ] Color swatches in PDP
- [ ] Size selector with green active state
- [ ] Delivery options radio buttons
- [ ] Qty stepper
- [ ] Reviews section 2-column layout
- [ ] Related products 3-column grid

**design-lab.html**
- [ ] Left rail 64px width
- [ ] Tools panel 300px
- [ ] Canvas stage center
- [ ] Inspector 360px right
- [ ] Rail buttons active state green
- [ ] Product toolbar under canvas
- [ ] Recommendations 4-column grid

**cart.html**
- [ ] Cart table responsive grid
- [ ] Item rows with remove button
- [ ] Qty controls inline
- [ ] Summary sidebar 360px
- [ ] Trust badges section

**checkout.html**
- [ ] Form 2-column layout
- [ ] Delivery options radio group
- [ ] Payment fields
- [ ] Order summary sidebar
- [ ] Place Order button full-width green

**order-confirmation.html**
- [ ] Success icon green circle
- [ ] Order number green text
- [ ] Info cards white with borders
- [ ] Help box light green background
- [ ] Actions sidebar 320px

**account.html**
- [ ] Left nav 240px sticky
- [ ] Orders cards with status badges
- [ ] Designs grid 3 columns
- [ ] Profile form max-width 500px

**help.html**
- [ ] Search bar centered
- [ ] FAQ accordions
- [ ] Resources grid 2 columns
- [ ] Contact box sidebar

**ndx-welcome.html**
- [ ] Split layout 1:1
- [ ] Left panel green gradient placeholder
- [ ] Form fields rounded corners
- [ ] Save/Next buttons aligned right

### Step 4: Common CSS Issues to Look For
1. **Colors**: All primary actions use `--color-primary: #10B981`
2. **Spacing**: Consistent gaps (16px, 24px, 32px)
3. **Border radius**: 12-14px for cards, 999px for pills
4. **Responsive breakpoints**: 640px, 1024px, 1440px
5. **Grid columns**: Check desktop/tablet/mobile transitions
6. **Active states**: Green highlights on interactions
7. **Typography**: Inter font, proper weights (600/700/800)

### Step 5: Send Screenshots
Provide screenshots of any pages that look off. I'll fix CSS accordingly.

