import Image from 'next/image';
import Link from 'next/link';

export function InkerSupportSection() {
    return (
        <section className="inker-support" aria-labelledby="inker-support-heading">
            <div className="container inker-support__grid">
                {/* Left Card: An Inker By Your Side */}
                <div className="inker-card inker-card--support">
                    <div className="inker-support__header">
                        <div className="inker-support__avatar">
                            {/* Using a placeholder image that looks like a support agent */}
                            {/* <Image 
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80" 
                alt="Support Agent" 
                width={80} 
                height={80} 
                className="inker-support__avatar-img"
              /> */}
                            {/* Fallback to local asset if external not desired, or just use a nice placeholder div/svg */}
                            <div className="inker-support__avatar-placeholder" style={{ padding: 0, overflow: 'hidden' }}>
                                <Image
                                    src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&h=200&q=80"
                                    alt="Superfan Support Agent"
                                    width={80}
                                    height={80}
                                    className="inker-support__avatar-img"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                        </div>
                        <div className="inker-support__content">
                            <h2 id="inker-support-heading" className="inker-support__title">A Superfan By Your Side</h2>
                            <p className="inker-support__desc">
                                Need help with your order? Get personalized support from our expert team as your partner from design to delivery.
                            </p>
                        </div>
                    </div>

                    <h3 className="inker-support__subtitle">How A Superfan Can Help</h3>

                    <div className="inker-features">
                        <div className="inker-feature">
                            <span className="inker-feature__icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" /></svg>
                            </span>
                            Product Selection
                        </div>
                        <div className="inker-feature">
                            <span className="inker-feature__icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                            </span>
                            Design Assistance
                        </div>
                        <div className="inker-feature">
                            <span className="inker-feature__icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                            </span>
                            Group Orders
                        </div>
                        <div className="inker-feature">
                            <span className="inker-feature__icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                            </span>
                            Order Support
                        </div>
                    </div>

                    <div className="inker-actions">
                        <a href="tel:4169166352" className="inker-btn inker-btn--outline">
                            <svg className="inker-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.12 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
                            416-916-6352
                        </a>
                        <a href="/help" className="inker-btn inker-btn--outline">
                            <svg className="inker-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
                            Chat Now
                        </a>
                        <a href="mailto:dtfsouvenir@gmail.com" className="inker-btn inker-btn--outline">
                            <svg className="inker-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                            Email Us
                        </a>
                    </div>
                </div>

                {/* Right Card: Your Price Includes */}
                <div className="inker-card inker-card--pricing">
                    <div className="inker-pricing__header">
                        <div className="inker-pricing__label">All-in Pricing</div>
                        <h2 className="inker-pricing__title">Your Price Includes</h2>
                    </div>

                    <ul className="inker-pricing__list">
                        {[
                            'No setup fees',
                            'FREE design review',
                            'FREE standard shipping',
                            'Exclusive artwork & fonts',
                            'Expert help, 7 days a week',
                            '100% satisfaction guarantee'
                        ].map((item, i) => (
                            <li key={i} className="inker-pricing__item">
                                <svg className="inker-pricing__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                {item}
                            </li>
                        ))}
                    </ul>

                    <Link href="/pricing" className="inker-btn inker-btn--primary">
                        Learn More
                    </Link>
                </div>
            </div>
        </section>
    );
}
