/**
 * Help Center Client Component
 * [2025-01-27 19:25:00] 帮助中心客户端组件（处理搜索和交互）
 * [2025-11-16 12:05:00] 原型化帮助中心布局与搜索
 * [2025-01-28 06:45:00] Updated to read content from CMS
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { contentApi } from '@/lib/api';

// [2025-01-28 06:45:00] 默认快速链接（向后兼容）
const defaultQuickLinks = [
  { id: 'default-1', label: 'Check order status', href: '/order-tracking', icon: '📦' },
  { id: 'default-2', label: 'Update shipping address', href: '/contact', icon: '📍' },
  { id: 'default-3', label: 'Launch Design Lab', href: '/design-lab', icon: '🎨' },
  { id: 'default-4', label: 'Review return policy', href: '/returns', icon: '↩️' },
  { id: 'default-5', label: 'Shipping information', href: '/shipping-info', icon: '🚚' },
  { id: 'default-6', label: 'Size guide', href: '/size-guide', icon: '📏' },
];

// [2025-01-28 06:45:00] 默认 FAQ 分类（向后兼容）
const defaultFaqCategories = [
  {
    id: 'default-orders',
    category: 'Orders',
    icon: '📦',
    items: [
      {
        id: 'default-orders-1',
        question: 'How long does production take?',
        answer:
          'Most apparel ships in 5–7 business days after proof approval. Rush options are available for faster delivery (3–5 business days).',
      },
      {
        id: 'default-orders-2',
        question: 'Can I cancel or modify my order?',
        answer:
          'Orders can be cancelled within 24 hours of placement. After that, orders may already be in production. Contact us immediately if you need to cancel or modify an order.',
      },
      {
        id: 'default-orders-3',
        question: 'How do I track my order?',
        answer:
          "Once your order ships, you'll receive an email with a tracking number. You can also track your order on our order tracking page using your order number.",
      },
      {
        id: 'default-orders-4',
        question: 'What if my order is incorrect or damaged?',
        answer:
          "Contact us within 14 days of delivery. We'll replace or refund your order to make things right. Custom products can only be returned if they differ from the approved proof.",
      },
    ],
  },
  {
    id: 'default-design',
    category: 'Design & Artwork',
    icon: '🎨',
    items: [
      {
        id: 'default-design-1',
        question: 'Can you help with logo cleanup?',
        answer:
          'Yes! Upload what you have and our design team will polish it for print at no extra cost. We can help with resolution improvements, color adjustments, and formatting.',
      },
      {
        id: 'default-design-2',
        question: 'What file formats do you accept?',
        answer:
          'We accept PNG, JPG, PDF, SVG, and AI files. For best results, use vector formats (PDF, SVG, AI) or high-resolution images (300 DPI or higher).',
      },
      {
        id: 'default-design-3',
        question: 'How do I use the Design Lab?',
        answer:
          'Simply click "Start Designing" on any product page. Upload your artwork, add text, and customize your design in real-time. Your design saves automatically.',
      },
      {
        id: 'default-design-4',
        question: 'Can I save my designs?',
        answer:
          'Yes! All designs are automatically saved to your account. You can access them anytime from "My Designs" in your account dashboard.',
      },
    ],
  },
  {
    id: 'default-shipping',
    category: 'Shipping & Delivery',
    icon: '🚚',
    items: [
      {
        id: 'default-shipping-1',
        question: 'Do you ship internationally?',
        answer:
          'We currently ship to Canada and the United States. International shipping may be available for large orders—contact us to discuss.',
      },
      {
        id: 'default-shipping-2',
        question: 'What are your shipping rates?',
        answer:
          'Standard shipping is free for orders over $50. Otherwise, rates start at $9.99 CAD within Canada and $12.99 CAD to the United States. Rush shipping options are available.',
      },
      {
        id: 'default-shipping-3',
        question: 'How long does shipping take?',
        answer:
          'Standard shipping: 7–10 business days (Canada) or 8–12 business days (United States). Rush shipping: 3–5 business days (Canada) or 5–7 business days (United States).',
      },
      {
        id: 'default-shipping-4',
        question: 'Do you track shipments?',
        answer:
          'Every order includes tracking numbers and proactive email notifications once your package is in transit. You can track your package using the tracking number provided.',
      },
    ],
  },
  {
    id: 'default-payment',
    category: 'Payment & Pricing',
    icon: '💳',
    items: [
      {
        id: 'default-payment-1',
        question: 'What payment methods do you accept?',
        answer:
          'We accept all major credit cards (Visa, Mastercard, American Express) and debit cards through Stripe. All transactions are secure and encrypted.',
      },
      {
        id: 'default-payment-2',
        question: 'When will I be charged?',
        answer: "Payment is processed when your order is confirmed. You'll receive a receipt by email immediately after payment.",
      },
      {
        id: 'default-payment-3',
        question: 'Do you offer bulk pricing?',
        answer:
          'Yes! Orders of 50+ items qualify for tiered volume discounts. Contact us for a custom quote on large orders.',
      },
      {
        id: 'default-payment-4',
        question: 'Can I use a coupon code?',
        answer: 'Yes! Enter your coupon code at checkout. Valid codes are automatically applied to your order total.',
      },
    ],
  },
  {
    id: 'default-returns',
    category: 'Returns & Exchanges',
    icon: '↩️',
    items: [
      {
        id: 'default-returns-1',
        question: 'What is your return policy?',
        answer:
          'Custom products can only be returned if they differ from the approved proof. Standard products can be returned within 14 days of delivery in original condition.',
      },
      {
        id: 'default-returns-2',
        question: 'How do I start a return?',
        answer:
          "Contact us with your order number and reason for return. We'll provide return instructions and a prepaid return label if applicable.",
      },
      {
        id: 'default-returns-3',
        question: 'When will I receive my refund?',
        answer:
          'Refunds are processed within 5–10 business days after we receive your returned items. The refund will be credited to your original payment method.',
      },
      {
        id: 'default-returns-4',
        question: 'Who pays for return shipping?',
        answer:
          "We cover return shipping costs if the item is defective or incorrect. Otherwise, return shipping is the customer's responsibility.",
      },
    ],
  },
  {
    id: 'default-promotional',
    category: 'Promotional Products',
    icon: '🎁',
    items: [
      {
        id: 'default-promotional-1',
        question: 'What are promotional products?',
        answer:
          'Promotional products are custom marketing merchandise featuring your company\'s logo or design. They include popular corporate swag items like pens, custom t-shirts, tote bags, and water bottles. Businesses use them for trade shows, client gifts, and employee appreciation to help gain brand impressions over time.',
      },
      {
        id: 'default-promotional-2',
        question: 'Why are promotional products important?',
        answer:
          'Custom promotional items help your company effectively gain a large quantity of brand impressions at a relatively reasonable cost. By adding your company\'s logo to popular custom promo products you can easily make connections with prospective customers, clients, and brand champions.',
      },
      {
        id: 'default-promotional-3',
        question: 'Who buys promo products?',
        answer:
          'Businesses of all sizes, including corporations, small companies, and non-profits use branded promotional products to raise visibility and connect with audiences. Companies in all industries use custom products for conferences and trade show booths, branded client gifts, sales material, and employee recognition and team building.',
      },
      {
        id: 'default-promotional-4',
        question: 'What are the most popular promotional products?',
        answer:
          'The most popular custom promotional items are custom t-shirts, drinkware, bags, pens, hats, and tech products. These items are budget-friendly, easy to order in bulk, and always useful, which is why they remain customer favorites.',
      },
      {
        id: 'default-promotional-5',
        question: 'How do I get started creating custom promotional products?',
        answer:
          'We offer a wide selection of popular promotional items. Upload your logo or design, start with a template, or create from scratch in our Design Lab. Choose from thousands of promo products, and our team of experts can help you find the right product for your organization and can guide you through the process from start to finish.',
      },
      {
        id: 'default-promotional-6',
        question: 'Can I put my logo on promotional products?',
        answer:
          'Yes! We make it easy to add your company\'s logo to thousands of custom promotional items, from custom water bottles and tech accessories to custom t-shirts and office supplies. Upload your logo to our Design Lab, create a new design from scratch, or work with our team of experts to create a promo product bundle that best serves your team\'s needs.',
      },
    ],
  },
];

export default function HelpClient() {
  // [2025-01-28 06:45:00] 从 CMS 获取帮助页内容
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const helpPage = contentData?.data?.helpPage;

  // [2025-01-28 06:45:00] 使用 CMS 数据或默认值（向后兼容）
  const quickLinks = helpPage?.quickLinks || defaultQuickLinks;
  const faqCategories = helpPage?.faqCategories || defaultFaqCategories;

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const filteredFAQs = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqCategories;
    }

    const query = searchQuery.toLowerCase();
    return faqCategories
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            item.question.toLowerCase().includes(query) ||
            item.answer.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [searchQuery, faqCategories]);

  const toggleFaq = (faqId: string) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  return (
    <section className="help">
      <div className="help-hero">
        <div className="container">
          <h1>Help Center</h1>
          <p>Find answers fast or contact our team for hands-on support.</p>
          <div className="help-search">
            <input
              type="search"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Search help center"
            />
            <button type="button">Search</button>
          </div>
        </div>
      </div>

      <div className="container help__grid">
        <section>
          <h2 className="eyebrow">Quick links</h2>
          <div className="quick-links">
            {quickLinks.map((link) => (
              <Link key={link.id || link.label} href={link.href} className="card">
                <span aria-hidden="true">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="faq">
          <h2>FAQs</h2>
          <div className="faq__grid">
            {filteredFAQs.map((category) => (
              <article key={category.id || category.category} className="faq-card">
                <header>
                  <span aria-hidden="true">{category.icon}</span>
                  <h3>{category.category}</h3>
                </header>
                <div>
                  {category.items.map((item) => {
                    const faqId = item.id || `${category.category}-${item.question}`;
                    const isExpanded = expandedFaq === faqId;
                    return (
                      <div key={faqId} className="faq-item">
                        <button type="button" onClick={() => toggleFaq(faqId)} aria-expanded={isExpanded}>
                          {item.question}
                          <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                        </button>
                        {isExpanded ? (
                          <p>{item.answer}</p>
                        ) : (
                          <p>{item.answer.substring(0, 120)}…</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>

        {filteredFAQs.length === 0 && searchQuery && (
          <div className="faq-empty">
            <p>No results found for &ldquo;{searchQuery}&rdquo;.</p>
            <p>
              Try different keywords or <Link href="/contact">contact our support team</Link>.
            </p>
          </div>
        )}

        <section className="help-box">
          <h2>Still need help?</h2>
          <p>
            Can&rsquo;t find what you&rsquo;re looking for? Reach out via <Link href="/contact">contact form</Link>, email{' '}
            <a href="mailto:support@suvernireplus.com">support@suvernireplus.com</a>, or call{' '}
            <a href="tel:8552712660">855-271-2660</a>.
          </p>
        </section>
      </div>
    </section>
  );
}
