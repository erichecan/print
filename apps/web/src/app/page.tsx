/**
 * Home Page
 * [2025-11-11 23:58:10] Migrated marketing homepage layout from prototype into Next.js
 * [2025-01-27 16:40:00] 补充完整的 SEO 元数据和结构化数据
 */
import Image from 'next/image';
import Link from 'next/link';
import { generateSEOMetadata, generateWebsiteSchema, generateOrganizationSchema } from '@/lib/seo';
import { CategoriesSection } from '@/components/home/CategoriesSection';
import { DatabaseCategoriesSection } from '@/components/home/DatabaseCategoriesSection';
import type { Metadata } from 'next';

// [2025-01-27 16:40:00] 生成首页 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Custom Merch & Promotional Products',
  description: 'Design custom t-shirts, hoodies, and apparel online. Free shipping, satisfaction guaranteed. Professional design tools, bulk pricing available.',
  keywords: ['custom t-shirts', 'custom apparel', 'promotional products', 'bulk printing', 'custom hoodies', 'design tools'],
  url: 'https://suvernireplus.com',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const heroCards = [
  { src: '/assets/hero/hero-card-tee.jpg', alt: 'Featured Tee' },
  { src: '/assets/hero/hero-card-bottle.jpg', alt: 'Featured Bottle' },
  { src: '/assets/hero/hero-card-hat.jpg', alt: 'Featured Hat' },
  { src: '/assets/hero/hero-card-bag.jpg', alt: 'Featured Bag' },
];

const servicePromises = [
  { title: 'Free Shipping', detail: '2-week delivery' },
  { title: '100% Satisfaction', detail: "We'll make it right" },
  { title: 'Design Help', detail: '7 days a week' },
  { title: 'Rush Options', detail: 'As fast as 3 days' },
];

// [2025-01-27 18:50:00] Categories are now loaded from API in CategoriesSection component

const brandLogos = [
  { name: 'Nike', src: '/assets/brands/nike.svg' },
  { name: 'Carhartt', src: '/assets/brands/carhartt.svg' },
  { name: 'New Era', src: '/assets/brands/new-era.png' },
  { name: 'The North Face', src: '/assets/brands/northface.svg' },
  { name: 'Stanley', src: '/assets/brands/stanley.svg' },
  { name: 'Patagonia', src: '/assets/brands/patagonia.svg' },
  { name: 'Champion', src: '/assets/brands/champion.png' },
  { name: 'Adidas', src: '/assets/brands/adidas.png' },
  { name: 'Columbia', src: '/assets/brands/columbia.png' },
  { name: 'Hydro Flask', src: '/assets/brands/hydro-flask.png' },
];

const testimonials = [
  { quote: 'Ordered with ease and delivered on time.', author: 'Mary B., NY', stars: 5 },
  { quote: 'Top quality, fast delivery, stellar support. Highly recommend!', author: 'Ingrid D., MD', stars: 5 },
  { quote: 'Great experience and responsive service. The site is easy to use.', author: 'Jenna F., WI', stars: 4 },
];

const enterprisePanels = [
  {
    title: 'Enterprise-Level Swag Management',
    description: 'Get custom kits, white-glove service, address collection, and global shipping with our enterprise solution.',
    ctaLabel: 'Get a Demo',
    ctaHref: '/contact',
  },
  {
    title: 'We’ll Do the Work',
    description: 'Ship to one place or every place. Choose your design and we handle the rest—from packing to delivery tracking.',
    ctaLabel: 'Start Designing',
    ctaHref: '/design-lab',
    ctaVariant: 'outline',
  },
];

export default function Home() {
  const websiteSchema = generateWebsiteSchema();
  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />{/* [2025-11-16 11:55:00] Website schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />{/* [2025-11-16 11:55:00] Organization schema */}
      <div>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="container hero__grid">
          <div>
            <h1 className="hero__title" id="hero-heading">
              Custom T-shirts & Promo Gear for Your Group
            </h1>
            <p className="hero__subtitle">
              From tees to tech, create premium swag with expert help, fast delivery, and a 100% satisfaction guarantee.
            </p>
            <div className="hero__actions">
              <Link className="btn" href="/design-lab">
                Start Designing
              </Link>
              <Link className="btn btn--outline" href="/products">
                Browse Products
              </Link>
              {/* [2025-11-15 15:21:40] Provide entry point to offline order intake */}
              <Link className="btn btn--outline" href="/offline-orders">
                Submit Offline Order
              </Link>
            </div>
          </div>
          <div className="hero__media" aria-label="Featured product categories">
            {heroCards.map((card) => (
              <div className="hero-card" key={card.alt}>
                <Image src={card.src} alt={card.alt} width={420} height={300} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="promises" aria-label="Service promises">
        <div className="container promises__grid">
          {servicePromises.map((promise) => (
            <div className="promise-card" key={promise.title}>
              <div className="promise-card__icon" aria-hidden="true" />
              <div>
                <div className="promise-card__label">{promise.title}</div>
                <div className="promise-card__detail">{promise.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* [2025-11-19 08:35:00] 数据库驱动的分类板块，使用数据库中的分类数据，桌面端一行显示4个 */}
      <DatabaseCategoriesSection />

      <section className="brands" aria-labelledby="brands-heading">
        <div className="container">
          <h2 className="visually-hidden" id="brands-heading">
            Featured brands
          </h2>
          <div className="brands__grid">
            {brandLogos.map((brand) => (
              <div key={brand.name} className="brand-logo" role="listitem" aria-label={brand.name}>
                <Image src={brand.src} alt={brand.name} width={120} height={40} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="testimonials" aria-labelledby="testimonials-heading">
        <div className="container">
          <h2 id="testimonials-heading" style={{ textAlign: 'center', marginBottom: '32px' }}>
            Loved by teams big and small
          </h2>
          <div className="testimonials__grid">
            {testimonials.map((testimonial) => (
              <article className="testimonial-card" key={testimonial.author} aria-label="Customer testimonial">
                <div className="testimonial-card__stars" aria-hidden="true">
                  {Array.from({ length: testimonial.stars }).map((_, index) => (
                    <span key={index}>★</span>
                  ))}
                </div>
                <p>{testimonial.quote}</p>
                <footer>— {testimonial.author}</footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="enterprise" aria-labelledby="enterprise-heading">
        <div className="container">
          <h2 id="enterprise-heading" style={{ textAlign: 'center', marginBottom: '32px' }}>
            Enterprise services to scale your swag
          </h2>
          <div className="enterprise__grid">
            {enterprisePanels.map((panel) => (
              <div className="enterprise-card" key={panel.title}>
                <h3>{panel.title}</h3>
                <p>{panel.description}</p>
                <Link className={`btn${panel.ctaVariant === 'outline' ? ' btn--outline' : ''}`} href={panel.ctaHref}>
                  {panel.ctaLabel}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
    </>
  );
}