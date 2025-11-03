# suvernire plus - Complete E-commerce Platform

A full-featured custom merchandise e-commerce platform with design lab, order management, and admin dashboard.

**Status:** ✅ Phase 1 Complete - Ready for Client Review  
**Built:** November 2025  
**Theme:** Brand Red (#FF1F3D)  
**Platform:** Static HTML + CSS + Vanilla JS

---

## Quick Start

```bash
# Clone the repository
cd print

# Start local server
python -m http.server 8080

# Open in browser
# Frontend: http://localhost:8080/home.html
# Admin: http://localhost:8080/admin/login.html
```

---

## System Overview

**33 Total Pages**
- 19 Frontend Pages (shop, design, checkout, account, support)
- 14 Admin Pages (products, orders, users, designs, marketing, settings)
- Full i18n support (English & Chinese)

---

## Pages Index

### Customer-Facing Pages

#### Shopping
- `home.html` - Landing page with hero, categories, brands
- `long-sleeve.html` - Product listing with filters & sort
- `product-hoodie.html` - Product detail with gallery & reviews

#### Design Tools
- `design-lab.html` - Visual design editor with canvas
- `design-gallery.html` - Saved designs showcase

#### Checkout Flow
- `cart.html` - Shopping cart
- `checkout.html` - Checkout form
- `order-confirmation.html` - Success page

#### Orders
- `order-detail.html` - Order details & timeline
- `order-tracking.html` - Shipping tracking

#### Account
- `account.html` - User dashboard
- `ndx-welcome.html` - Login
- `register.html` - Registration
- `forgot-password.html` - Password reset
- `profile-edit.html` - Edit profile

#### Marketing & Support
- `promotions.html` - Active deals
- `contact.html` - Contact form
- `help.html` - FAQ & resources

---

### Admin Dashboard

**Access:** `admin/login.html`

- `admin/index.html` - Dashboard with KPIs
- `admin/products.html` - Product management
- `admin/product-edit.html` - Create/edit products
- `admin/categories.html` - Category management
- `admin/orders.html` - Order management
- `admin/order-detail.html` - Order details (admin)
- `admin/users.html` - User management
- `admin/user-detail.html` - User profile
- `admin/designs.html` - Design submissions
- `admin/design-review.html` - Review workflow
- `admin/coupons.html` - Coupon codes
- `admin/promotions.html` - Bulk discounts
- `admin/settings.html` - System config

---

## Design System

### Brand Colors
- **Core Red**: `#FF1F3D`
- **Secondary Red**: `#E3002B`
- **Dark Red**: `#CC0026`
- **Ink Black**: `#121212`
- **Pure White**: `#FFFFFF`
- **Warm Gray**: `#F8F8F8`

### Typography
- **Font**: Inter, system-ui
- **Weights**: 400, 500, 600, 700, 800
- **Scales**: 12px → 48px

### Components
- Buttons (primary, outline)
- Cards & grids
- Forms & inputs
- Tables & lists
- Status badges
- Navigation (sidebar, header)

---

## Key Features

### Frontend
✅ Product browsing with filters  
✅ Shopping cart & checkout  
✅ Design lab with visual editor  
✅ Order tracking & history  
✅ User authentication  
✅ Account management  
✅ Promotions & deals  
✅ Help center  

### Admin
✅ Dashboard analytics  
✅ Product CRUD  
✅ Category management  
✅ Order management  
✅ User management  
✅ Design review workflow  
✅ Coupon management  
✅ Bulk promotions  
✅ System settings  

---

## File Structure

```
/
├── Frontend Pages
│   ├── home.html
│   ├── long-sleeve.html
│   ├── product-hoodie.html
│   ├── design-lab.html
│   ├── design-gallery.html
│   ├── cart.html, checkout.html, order-confirmation.html
│   ├── order-detail.html, order-tracking.html
│   ├── account.html, ndx-welcome.html, register.html
│   ├── forgot-password.html, profile-edit.html
│   ├── promotions.html, contact.html, help.html
│
├── Admin Pages
│   └── admin/
│       ├── login.html, index.html
│       ├── products.html, product-edit.html, categories.html
│       ├── orders.html, order-detail.html
│       ├── users.html, user-detail.html
│       ├── designs.html, design-review.html
│       ├── coupons.html, promotions.html, settings.html
│       └── admin.css
│
├── Styles
│   ├── styles.css (main design system)
│
└── Assets
    └── assets/ (images, icons, brand logos)
```

---

## Documentation

- `COMPLETE-SYSTEM.md` - Full system documentation
- `THEME-MIGRATION.md` - Color theme migration notes
- `visual-check.md` - Visual testing checklist
- `style-guide.md` - Design guidelines

---

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, Grid, Flexbox
- **JavaScript** - Vanilla JS (minimal, form handling)
- **Responsive** - Mobile-first design
- **Accessibility** - ARIA labels, semantic HTML

---

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile responsive (640px, 1024px)

---

## Documentation

- 📊 [Complete Project Status](./PROJECT-STATUS-FINAL.md) - Full feature list & stats
- 📡 [API Specification](./API-SPEC.md) - 60+ endpoints documented
- 🗄️ [Database Schema](./DATABASE-SCHEMA.md) - 19 tables with relationships
- 🎨 [Design System](./THEME-MIGRATION.md) - Brand red theme details
- 🌐 [i18n Implementation](./I18N-IMPLEMENTATION.md) - Bilingual support
- 🔍 [SEO Guide](./SEO-GUIDE.md) - SEO optimization
- 📈 [Progress Report](./PHASE-1-PROGRESS.md) - Completion tracking

---

## Next Steps

### Phase 2: Backend Development
1. Set up Node.js + Express server
2. Implement PostgreSQL database
3. Build 60+ API endpoints
4. Integrate Stripe/PayPal payment
5. Set up AWS S3 file storage
6. Add email notifications
7. Implement security measures

### Phase 3: Launch Preparation
1. Populate product catalog
2. Create help content
3. Configure analytics
4. Run security audit
5. Load testing
6. Deploy to production

---

**Built with ❤️ for custom merchandise e-commerce**

**Phase 1 Complete** ✅ Ready for client review & backend integration
