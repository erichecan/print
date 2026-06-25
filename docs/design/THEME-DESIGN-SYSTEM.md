# Discovery Theme — Design System Reference

> Source: Discovery theme by Grixio (demo store: discovery-lavish.myshopify.com)
> Analyzed: 2026-05-25
> Style positioning: **Luxury accessible fashion — editorial-first, sharp geometry, warm neutrals**

---

## 1. Typography

### Font Families

| Role | Font | Fallback | Weight |
|------|------|----------|--------|
| Headings | Marcellus | serif | 400 (regular only) |
| Body / UI | Instrument Sans | sans-serif | 400 |

The pairing is intentional contrast: Marcellus is a classical Roman serif with a slightly condensed letterform and ink-trap details — it reads as refined/editorial. Instrument Sans is geometric and neutral — it disappears in body text and UI labels.

### Heading CSS Variables

```css
--font-family-heading: Marcellus, serif;
--font-weight-heading: 400;
--letter-spacing-heading: -0.02em;    /* tighten headings */
--line-height-heading: 1;             /* tight line height for display use */

--font-h1: calc(clamp(3rem, 4vw + 1rem, 5rem)    * var(--font-heading-scale));
--font-h2: calc(clamp(2.5rem, 3.5vw + 0.8rem, 3.75rem)  * var(--font-heading-scale));
--font-h3: calc(clamp(2rem, 3vw + 0.6rem, 2.813rem)      * var(--font-heading-scale));
--font-h4: calc(clamp(1.6rem, 2.5vw + 0.4rem, 1.875rem)  * var(--font-heading-scale));
--font-h5: calc(clamp(1.4rem, 2vw + 0.3rem, 1.5625rem)   * var(--font-heading-scale));
--font-h6: calc(clamp(1.25rem, 1.8vw + 0.25rem, 1.375rem)* var(--font-heading-scale));
```

H1 scales from **48px → 80px** fluid. H2: **40px → 60px**. H3: **32px → 45px**.

### Body CSS Variables

```css
--font-family-body: "Instrument Sans", sans-serif;
--font-weight-body: 400;
--line-height-body: 1.5;

--font-size-xs:  clamp(0.75rem,  …);   /* ~12px */
--font-size-sm:  clamp(0.875rem, …);   /* ~14px */
--font-size-md:  clamp(1rem,     …);   /* ~16px — base */
--font-size-lg:  clamp(1.1875rem,…);   /* ~19px */
--font-size-xl:  clamp(1.3125rem,…);   /* ~21px */
--font-size-2xl: clamp(1.5rem,   …);   /* ~24px */
```

### Text Transform

```css
--button-text-transform: uppercase;
```

All button labels are `uppercase`. Navigation links and section labels also commonly use uppercase/small-caps styling.

---

## 2. Color System

The theme uses **five named color schemes** applied as CSS classes. Sections freely mix schemes to create visual rhythm.

### Scheme 1 — Primary (White)

The default scheme. Clean and light.

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#FFFFFF` | Page default, product cards |
| Surface | `#F8F8F8` | Card backgrounds, alternate rows |
| Body text | `#121212` | Paragraphs, labels |
| Heading | `#000000` | All display headings |
| Link / accent | `#B40C1C` | Links, hover states, price highlights |
| Border | `#DBDBDB` | Dividers, input outlines |
| Card bg | `#F8F8F8` | Product card backgrounds |
| **Primary button** bg | `#000000` | — |
| Primary button text | `#FFFFFF` | — |
| Primary button hover bg | `#FFFFFF` | Inverts on hover |
| Primary button hover text | `#000000` | — |
| Primary button border | `#4B4B4B` | Always visible border |
| **Secondary button** bg | `#FFFFFF` | — |
| Secondary button border | `#4B4B4B` | — |
| Input background | `#FFFFFF` | — |
| Input border | `#737373` | — |

### Scheme 2 — Secondary (Blush Pink)

Used for promotional callout sections (e.g., newsletter banner, feature strips).

| Token | Value |
|-------|-------|
| Background | `#F3E7E7` |
| Text | Same as primary |

Dusty rose / blush. Warm and feminine without being loud.

### Scheme 3 — Tertiary (Charcoal Dark)

Used for high-contrast hero sections, countdown banners, and dramatic feature moments.

| Token | Value |
|-------|-------|
| Background | `#29272B` |
| Gradient (radial) | `radial-gradient(rgba(82,63,40,1) 3%, rgba(17,14,14,1) 55%)` |
| All text | `#FFFFFF` |
| Buttons | White fill / black text (inverted from primary) |

The gradient introduces warm mocha undertones against the near-black — gives depth and warmth rather than a flat dark.

### Scheme 4 — Sand / Cream

| Token | Value |
|-------|-------|
| Background | `#F1EEE9` |

Warm sand. Used for editorial sections, "New Arrivals" backgrounds, softer-toned content blocks.

### Scheme 5 — Light Gray

| Token | Value |
|-------|-------|
| Background | `#EFEFEF` |

Neutral gray. Used for alternating section contrast without the warmth of sand.

### Color Palette Summary

```
#FFFFFF  White         — primary bg
#F8F8F8  Off-white     — card surface
#F3E7E7  Blush rose    — secondary accent bg
#F1EEE9  Warm cream    — sand bg
#EFEFEF  Cool gray     — neutral alternate bg
#DBDBDB  Light border  — dividers
#737373  Mid gray      — input borders, muted text
#4B4B4B  Dark gray     — button borders, secondary text
#29272B  Charcoal      — dark scheme bg
#121212  Near-black    — body text
#000000  Black         — headings, primary button
#B40C1C  Deep crimson  — accent / link / hover
```

---

## 3. Layout System

### Container & Spacing

```css
--size-page-max:        1700px;    /* wider than typical — generous for editorial */
--space-section-top:    60px;
--space-section-bottom: 60px;
--space-page-gutter-mobile: 1rem;
```

Max container width **1700px** is notably wide. This allows full-bleed editorial photography to span nearly edge-to-edge even on large monitors while maintaining comfortable reading widths for text-heavy sections.

Section padding is symmetric at 60px top/bottom — creates consistent vertical rhythm.

### Border Radius

```css
--button-radius:  0rem;      /* sharp square corners */
--input-radius:   0rem;      /* sharp */
--card-radius:    0rem;      /* sharp */
--badge-radius:   999rem;    /* pill — only exception */
--arrow-radius:   0.313rem;  /* 5px — subtle rounding on nav arrows */
--swatch-radius:  0.313rem;
--variant-radius: 0.313rem;
```

Everything is **sharp (0px radius)** except badges, which are full pills. This creates a precise, architectural aesthetic. The contrast between hard-edged cards/buttons and pill-shaped badges is a deliberate design tension.

### Grid

- **Product grid**: 4 columns desktop, 2 columns mobile with gap-based spacing
- **Collection listing grid**: Can render 3–4 columns depending on section setting
- **Asymmetric layouts**: Some hero sections use split-screen (50/50 or 60/40) text + image
- **Full-bleed sections**: Photography sections frequently use `100vw` width, ignoring container constraints

### Header

```css
--header-logo-width:        150px;
--header-logo-width-mobile: 100px;
```

Logo is constrained and clean. Header is typically transparent over hero images and transitions to solid on scroll.

---

## 4. Component Patterns

### Buttons

Two primary variants, both sharp-cornered:

**Primary (filled black)**
```
Background: #000000
Text: #FFFFFF (uppercase)
Border: 1px solid #4B4B4B
Hover: inverts → white bg, black text
```

**Secondary (outline)**
```
Background: #FFFFFF
Text: #000000 (uppercase)
Border: 1px solid #4B4B4B
```

Both use uppercase label text. No border-radius. The hover inversion (black↔white) is clean and snappy.

### Badges / Tags

Pill-shaped (`border-radius: 999rem`). Used for:
- "NEW" label on product cards
- "SALE" / percentage-off tags
- Status indicators

Typically small, uppercase, tight letter-spacing.

### Product Cards

- Background: `#F8F8F8` (off-white surface)
- Sharp corners
- Product image fills the card top
- Hover state: second image crossfades in
- Below image: brand/collection label (small uppercase), product name (Marcellus), price
- Variant swatches appear on card hover
- "Quick add" or "Add to cart" button appears on hover
- Sale badge overlaid on image corner

### Navigation

- Horizontal desktop nav with dropdown mega-menus
- Transparent header over hero → solid white on scroll
- Logo centered or left-aligned
- Cart icon with item count badge
- Mobile: hamburger → slide-in drawer

### Form Inputs

- Sharp corners (`--input-radius: 0rem`)
- Border: `1px solid #737373`
- Background: `#FFFFFF`
- Focus: border darkens to `#000000`

---

## 5. Homepage Section Inventory

The Discovery theme demo uses approximately 20 section types on the homepage. Listed top to bottom as found in the demo:

### 5.1 Announcement Bar
- Thin strip above header
- Marquee/scrolling ticker text
- Typically dark bg (charcoal scheme) with white text
- Cycling promotional messages

### 5.2 Hero — Full-Bleed Photography
- 100% viewport height (or near)
- Editorial photography, no overlay gradient
- Minimal text overlay: headline in Marcellus (large, white or dark depending on image)
- CTA button (secondary/outline style)
- Can have 2-column split variant (image left, text right)

### 5.3 Marquee Ticker / Text Banner
- Horizontal scrolling repeating text
- Large display text, all caps
- Alternates solid color bg with icon separators (e.g., small star glyphs)
- Used as section dividers for visual rhythm

### 5.4 Featured Collection — Product Grid
- Section heading (Marcellus, centered or left)
- 4-column product card grid
- Optional "View All" link

### 5.5 Split Editorial — Text + Image
- 50/50 or 60/40 two-column layout
- One side: lifestyle photography
- Other side: headline + body copy + CTA
- Background: sand or cream scheme

### 5.6 Before / After Image Slider
- Interactive draggable divider between two product images
- Drag left/right to reveal "before" vs "after" (e.g., styling difference, fabric detail)
- Distinctive interactive section — not common in fashion themes

### 5.7 Video Hero Section
- Full-bleed autoplay video (muted, looping)
- Text overlay with headline + CTA
- Plays ambient lifestyle video

### 5.8 Countdown Timer Section
- Uses tertiary (charcoal) color scheme
- Large countdown display (HH:MM:SS)
- "SALE ENDS IN" label
- Prominent CTA button
- Creates urgency moment in the scroll journey

### 5.9 Shop The Look (Hotspot)
- Lifestyle photography with interactive dot hotspots
- Click hotspot → product card flyout appears
- Hotspot dot: small circle with pulse animation
- One of the more sophisticated interactive sections

### 5.10 Build Your Look
- Multi-product interactive builder
- Side panel with categorized product options (Tops, Bottoms, Bags, etc.)
- Main visual shows current combination
- Mix-and-match discovery mechanic

### 5.11 Testimonials / Reviews
- Grid or carousel of customer review cards
- Star rating display
- Customer name + review text
- Background: white or off-white

### 5.12 Instagram / UGC Gallery
- Grid of lifestyle/UGC photos
- Links to products or social
- Masonry or uniform grid layout

### 5.13 Newsletter / Email Capture
- Full-width section using blush pink or sand scheme
- Headline + short subtext
- Email input + "Subscribe" button (side by side)

### 5.14 Blog Posts Grid
- 2–3 column editorial card grid
- Blog post thumbnail + category label + title
- Photography-first presentation

### 5.15 Brand Logos / Press
- "As seen in" strip
- Grayscale brand logos in a horizontal row
- Minimal, credibility-building

### 5.16 Category Navigation Tiles
- Grid of collection tiles
- Full-bleed category image + label overlaid
- Quick-nav into collection pages

### 5.17 New Arrivals Feature
- Large single-product or few-product feature
- Editorial styling, larger image
- Background: sand or cream scheme

### 5.18 Promotional Banner
- Full-width strip with promotional message
- Can be simple (text only) or image-backed
- Often using secondary (blush) or tertiary (charcoal) scheme

### 5.19 Footer
- Dark background (charcoal or black)
- Multi-column: nav links, newsletter signup, social icons, legal
- White text
- Logo at top
- Payment icons row at bottom

---

## 6. Collection (PLP) Page

### Layout
- Left sidebar: filter panel (collapsible on mobile)
- Main area: product grid (3–4 columns)
- Top bar: sort dropdown + active filter chips + result count

### Filter Panel
- Accordion-style expandable filter groups
- Checkbox + label for each filter option
- Count badges showing available products per option
- "Clear all" link

### Product Cards on PLP
Same as homepage card pattern (see Section 4). Consistent across pages.

### Pagination
- Load more button (infinite scroll or paginated)

---

## 7. Product Detail (PDP) Page

### Layout
- Desktop: 2-column — Gallery left (60%), Buy Box right (40%)
- Mobile: stacked — gallery → buy box → tabs → recommendations

### Gallery
- Main image large, full-height left column
- Thumbnail strip (vertical, left of main image on desktop)
- Multiple images + video thumbnails
- Zoom on hover
- Swipe on mobile

### Buy Box (Right Column)
- Breadcrumb navigation
- Product title (Marcellus, H2 size)
- Price (large, with sale price in accent red `#B40C1C`)
- Variant selectors:
  - Color: visual swatches (small circles, `--swatch-radius: 0.313rem`)
  - Size: text buttons (sharp corners, `--variant-radius: 0.313rem`)
- Size guide link
- Quantity selector (numeric input, no spinners per global CSS rule)
- **Add to Cart** button — full width, primary black
- **Buy Now** button — secondary outline
- Product description (collapsible or visible)
- Shipping info accordion
- Returns accordion

### Sticky Add to Cart Bar
- Appears after scrolling past the buy box
- Thin persistent bar at bottom of viewport
- Product thumbnail + name + size selector + "Add to Cart" button
- Slides up from bottom on scroll

### Below the Fold
- **Accordion tabs**: Description, Materials & Care, Shipping, Returns
- **Video section**: Model/product video embed
- **Complementary products** carousel
- **Recently viewed** row
- **Complete the Look** section (related outfit pieces)

---

## 8. Interactive Features

### Countdown Timer
- CSS animated flip/decrement
- Tied to sale end date
- High-urgency visual, dark scheme background

### Marquee Ticker
- CSS `animation: marquee linear infinite`
- Seamless looping
- Large decorative text or promotional copy

### Before/After Slider
- Drag-based divider
- Touch-enabled for mobile
- Clean line divider with circular drag handle

### Shop The Look Hotspots
- Pulsing dot animation on hotspot pins
- Click/tap triggers product card overlay
- Non-modal: card appears adjacent to hotspot

### Build Your Look Panel
- Slide-in or toggle side panel
- Tab-based category navigation
- Real-time visual update of look combination

### Quick Add (on product cards)
- Hover-triggered size selector overlay on card
- "Add to Cart" without leaving the grid
- Smooth fade in/out transition

### Image Hover Swap
- Product card secondary image crossfades on hover
- CSS transition based (no JS required)
- Shows model/lifestyle alternate view

---

## 9. Design Language Summary

**Aesthetic**: Luxury accessible fashion. Not cold-minimalist (Swiss/Scandinavian), not maximalist. The use of Marcellus serif anchors it in tradition and craftsmanship. The sharp geometry (0px radius everywhere) modernizes it. The editorial photography style and generous whitespace create a high-end boutique feel.

**Mood words**: Editorial, refined, precise, warm, fashion-forward, accessible luxury.

**Key differentiators**:
1. Fluid type scale with tight heading letter-spacing (-0.02em) — makes headings feel like magazine typography
2. Zero-radius hard corners on all interactive elements — creates architectural precision
3. Five-scheme color system with warm neutrals (blush, sand, cream) plus dramatic charcoal — avoids flat monochrome while staying cohesive
4. Deep crimson `#B40C1C` as the single accent color — restrained but powerful
5. Wide max-container (1700px) — feels less cramped than typical 1280px-max themes
6. Rich interactive sections (before/after, build-your-look, shop-the-look) — high engagement without sacrificing performance

**Do not use**:
- Rounded cards or rounded buttons (breaks the sharp geometric language)
- Bright colors or multiple accent colors
- Dense text blocks without generous whitespace
- Heavy drop shadows (the theme avoids them entirely)
- Decorative illustrations or icons (photography-only aesthetic)
