/**
 * Site Header component
 * [2025-11-11 23:56:10] Migrated marketing header layout from prototype into Next.js
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent } from 'react';
import { CartIcon } from '@/components/CartIcon';

export function SiteHeader() {
  const router = useRouter();

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = (formData.get('q') as string)?.trim();
    if (!query) {
      router.push('/products');
      return;
    }
    router.push(`/products?search=${encodeURIComponent(query)}`);
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="top-message-bar" role="region" aria-label="Promotional message">
        Custom T-shirts & Promotional Products • Fast & Free Shipping • All-inclusive Pricing
      </div>
      <header className="site-header" role="banner">
        <div className="container site-header__row">
          <div className="site-header__brand">
            <Link href="/" aria-label="Suvernire Plus home">
              <Image src="/assets/logo.svg" alt="Suvernire Plus" width={160} height={44} priority />
            </Link>
          </div>
          <div className="site-header__search" role="search">
            <form onSubmit={handleSearch} aria-label="Site search form">
              <button type="submit" aria-label="Search products">
                🔍
              </button>
              <input
                type="search"
                name="q"
                placeholder="Search for t-shirts, hoodies, drinkware, and more"
                aria-label="Search query"
              />
            </form>
          </div>
          <div className="site-header__contact" aria-label="Contact options">
            <div className="contact-card">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1v3.6a1 1 0 01-.91 1 19 19 0 01-8.29-2.77 18.83 18.83 0 01-5.78-5.78A19 19 0 012.9 4.93a1 1 0 011-.91H7.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.01l-2.21 2.2z"
                />
              </svg>
              <div>
                <span className="label">Talk to a Real Person</span>
                <a className="value" href="tel:8552712660">
                  855-271-2660
                </a>
              </div>
            </div>
            <div className="contact-card">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M20 2H4a2 2 0 00-2 2v16l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"
                />
              </svg>
              <div>
                <span className="label">Chat with a Real Person</span>
                <Link className="value" href="/help">
                  Chat now
                </Link>
              </div>
            </div>
          </div>
        </div>
        <nav className="primary-nav" aria-label="Primary">
          <div className="container primary-nav__inner">
            <ul className="mega">
              <li className="mega__item">
                <Link href="/products" className="mega__trigger">Custom T-shirts</Link>
                <div className="mega__panel" role="region" aria-label="Custom T-shirts">
                  <div className="mega__cols">
                    <div className="mega__col">
                      <Link href="/products?category=short-sleeve">Short Sleeve T-shirts</Link>
                      <Link href="/products?category=long-sleeve">Long Sleeve T-shirts</Link>
                      <Link href="/products?category=tank-tops">Tank Tops & Sleeveless</Link>
                    </div>
                    <div className="mega__col">
                      <Link href="/products?category=performance">Performance Shirts</Link>
                      <Link href="/products?category=tri-blend">Soft Tri-Blend T-shirts</Link>
                      <Link href="/products?category=sustainable">Sustainable T-shirts</Link>
                    </div>
                    <div className="mega__col">
                      <Link href="/products?category=women">Women’s T-shirts</Link>
                      <Link href="/products?category=kids">Kids T-shirts</Link>
                    </div>
                    <div className="mega__col">
                      <Link href="/products?tag=no-minimum">No Minimum T-shirts</Link>
                      <Link href="/products">View All Custom T-shirts</Link>
                    </div>
                  </div>
                </div>
              </li>
              <li className="mega__item">
                <Link href="/collections/apparel" className="mega__trigger">Custom Apparel</Link>
                <div className="mega__panel" role="region" aria-label="Custom Apparel">
                  <div className="mega__cols">
                    <div className="mega__col">
                      <Link href="/products?category=hoodies">Hoodies</Link>
                      <Link href="/products?category=crewneck-sweatshirts">Crewneck Sweatshirts</Link>
                      <Link href="/products?category=quarter-zip">Quarter Zip Sweatshirts</Link>
                      <Link href="/products?category=sweatshirts">View All Sweatshirts</Link>
                    </div>
                    <div className="mega__col">
                      <Link href="/products?category=baseball-hats">Baseball Hats</Link>
                      <Link href="/products?category=trucker-hats">Trucker Hats</Link>
                      <Link href="/products?category=beanies">Beanies</Link>
                      <Link href="/products?category=all-hats">View All Hats</Link>
                    </div>
                    <div className="mega__col">
                      <Link href="/products?category=jackets">Jackets</Link>
                      <Link href="/products?category=polo-shirts">Polo Shirts</Link>
                      <Link href="/products?category=business-apparel">Business Apparel</Link>
                      <Link href="/products?category=workwear">Workwear & Uniforms</Link>
                    </div>
                    <div className="mega__col">
                      <Link href="/products?category=activewear">Activewear</Link>
                      <Link href="/products?category=team-jerseys">Team Jerseys</Link>
                      <Link href="/products?category=pants-shorts">Pants & Shorts</Link>
                      <Link href="/products?category=accessories">Accessories</Link>
                    </div>
                  </div>
                </div>
              </li>
              <li className="mega__item">
                <Link href="/collections/promotional-products" className="mega__trigger">Promotional Products</Link>
                <div className="mega__panel" role="region" aria-label="Promotional Products">
                  <div className="mega__cols">
                    <div className="mega__col">
                      <Link href="/products?category=water-bottles">Water Bottles</Link>
                      <Link href="/products?category=mugs">Mugs</Link>
                      <Link href="/products?category=tumblers">Tumblers</Link>
                      <Link href="/products?category=koozies">Koozie®</Link>
                      <Link href="/products?category=drinkware">View All Drinkware</Link>
                    </div>
                    <div className="mega__col">
                      <Link href="/products?category=backpacks">Backpacks</Link>
                      <Link href="/products?category=tote-bags">Tote Bags</Link>
                      <Link href="/products?category=drawstring-bags">Drawstring Bags</Link>
                      <Link href="/products?category=pouches">Pouches</Link>
                      <Link href="/products?category=bags">View All Bags</Link>
                    </div>
                    <div className="mega__col">
                      <Link href="/products?category=pens">Pens & Writing</Link>
                      <Link href="/products?category=stationery">Stationery</Link>
                      <Link href="/products?category=stickers">Stickers & Magnets</Link>
                      <Link href="/products?category=office-supplies">Office Supplies</Link>
                      <Link href="/products?category=technology">Technology</Link>
                    </div>
                    <div className="mega__col">
                      <Link href="/products?category=gifts">Gifts</Link>
                      <Link href="/products?category=trade-show">Trade Show & Signage</Link>
                      <Link href="/products?category=outdoor">Outdoor & Leisure</Link>
                      <Link href="/products?category=home-auto-tools">Home, Auto, & Tools</Link>
                      <Link href="/products?category=health">Health & Personal Care</Link>
                    </div>
                  </div>
                </div>
              </li>
              <li className="mega__item">
                <Link href="/design-lab" className="mega__trigger">Design Lab</Link>
                <div className="mega__panel mega__panel--simple">
                  <div className="mega__cta">
                    <h3>The Design Lab Makes It Fun & Easy to Design</h3>
                    <p>Create custom t-shirts and promotional products your group will love. Simply upload your own logo or create a design using our collection of fonts & artwork.</p>
                    <div className="mega__cta-actions">
                      <Link className="btn btn--primary" href="/design-lab">Start Designing</Link>
                      <Link className="btn btn--outline" href="/design-lab?templates=1">Explore Templates</Link>
                    </div>
                  </div>
                </div>
              </li>
              <li className="mega__item">
                <Link href="/help" className="mega__trigger">Groups & Events</Link>
                <div className="mega__panel" role="region" aria-label="Groups & Events">
                  <div className="mega__cols">
                    <div className="mega__col">
                      <strong>Tools & Resources</strong>
                      <Link href="/help#group-ordering">Group Ordering</Link>
                      <Link href="/help#fundraising">Fundraising</Link>
                      <Link href="/help#online-stores">Online Stores</Link>
                      <Link href="/help#pro-services">Pro Services</Link>
                      <Link href="/help#tips">Tips & Advice</Link>
                      <Link href="/design-lab">T-shirt Maker</Link>
                    </div>
                    <div className="mega__col">
                      <strong>Businesses & Professionals</strong>
                      <Link href="/help#corporate-swag">Corporate Swag</Link>
                      <Link href="/help#businesses">For Businesses</Link>
                      <Link href="/help#trade-shows">For Trade Shows</Link>
                    </div>
                    <div className="mega__col">
                      <strong>Schools & Groups</strong>
                      <Link href="/help#schools">For Schools K-12</Link>
                      <Link href="/help#colleges">For Teachers & Colleges</Link>
                      <Link href="/help#sports">For Sports Teams</Link>
                      <Link href="/help#celebrations">For Activities & Celebrations</Link>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
            <div className="primary-nav__actions">
              <Link href="/login">
                <Image src="/assets/icon-person.svg" alt="" width={20} height={20} aria-hidden="true" />
                <span>Sign in</span>
              </Link>
              <CartIcon />
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}

