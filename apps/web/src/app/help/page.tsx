/**
 * Help Center Page
 * [2025-11-11 22:32:45] Scaffold
 * [2025-11-12 00:06:40] Published quick links and FAQs
 * [2025-01-27 17:20:00] 补充 SEO 元数据
 * [2025-01-27 19:25:00] 完善帮助中心 - 添加更多 FAQ 和搜索功能
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// [2025-01-27 17:20:00] 生成帮助中心页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Help Center - FAQs & Support',
  description: 'Find answers to frequently asked questions about orders, shipping, returns, design lab, and more. Get help with your custom merchandise order.',
  keywords: ['help', 'FAQ', 'support', 'customer service', 'shipping', 'returns', 'order help'],
  url: 'https://suvernireplus.com/help',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const quickLinks = [
  { label: 'Check order status', href: '/order-tracking', icon: '📦' },
  { label: 'Update shipping address', href: '/contact', icon: '📍' },
  { label: 'Launch Design Lab', href: '/design-lab', icon: '🎨' },
  { label: 'Review return policy', href: '/returns', icon: '↩️' },
  { label: 'Shipping information', href: '/shipping-info', icon: '🚚' },
  { label: 'Size guide', href: '/size-guide', icon: '📏' },
];

const faqCategories = [
  {
    category: 'Orders',
    icon: '📦',
    items: [
      {
        question: 'How long does production take?',
        answer: 'Most apparel ships in 5–7 business days after proof approval. Rush options are available for faster delivery (3–5 business days).',
      },
      {
        question: 'Can I cancel or modify my order?',
        answer: 'Orders can be cancelled within 24 hours of placement. After that, orders may already be in production. Contact us immediately if you need to cancel or modify an order.',
      },
      {
        question: 'How do I track my order?',
        answer: 'Once your order ships, you'll receive an email with a tracking number. You can also track your order on our order tracking page using your order number.',
      },
      {
        question: 'What if my order is incorrect or damaged?',
        answer: 'Contact us within 14 days of delivery. We'll replace or refund your order to make things right. Custom products can only be returned if they differ from the approved proof.',
      },
    ],
  },
  {
    category: 'Design & Artwork',
    icon: '🎨',
    items: [
      {
        question: 'Can you help with logo cleanup?',
        answer: 'Yes! Upload what you have and our design team will polish it for print at no extra cost. We can help with resolution improvements, color adjustments, and formatting.',
      },
      {
        question: 'What file formats do you accept?',
        answer: 'We accept PNG, JPG, PDF, SVG, and AI files. For best results, use vector formats (PDF, SVG, AI) or high-resolution images (300 DPI or higher).',
      },
      {
        question: 'How do I use the Design Lab?',
        answer: 'Simply click "Start Designing" on any product page. Upload your artwork, add text, and customize your design in real-time. Your design saves automatically.',
      },
      {
        question: 'Can I save my designs?',
        answer: 'Yes! All designs are automatically saved to your account. You can access them anytime from "My Designs" in your account dashboard.',
      },
    ],
  },
  {
    category: 'Shipping & Delivery',
    icon: '🚚',
    items: [
      {
        question: 'Do you ship internationally?',
        answer: 'We currently ship to Canada and the United States. International shipping may be available for large orders—contact us to discuss.',
      },
      {
        question: 'What are your shipping rates?',
        answer: 'Standard shipping is free for orders over $50. Otherwise, rates start at $9.99 CAD within Canada and $12.99 CAD to the United States. Rush shipping options are available.',
      },
      {
        question: 'How long does shipping take?',
        answer: 'Standard shipping: 7–10 business days (Canada) or 8–12 business days (United States). Rush shipping: 3–5 business days (Canada) or 5–7 business days (United States).',
      },
      {
        question: 'Do you track shipments?',
        answer: 'Every order includes tracking numbers and proactive email notifications once your package is in transit. You can track your package using the tracking number provided.',
      },
    ],
  },
  {
    category: 'Payment & Pricing',
    icon: '💳',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards (Visa, Mastercard, American Express) and debit cards through Stripe. All transactions are secure and encrypted.',
      },
      {
        question: 'When will I be charged?',
        answer: 'Payment is processed when your order is confirmed. You\'ll receive a receipt by email immediately after payment.',
      },
      {
        question: 'Do you offer bulk pricing?',
        answer: 'Yes! Orders of 50+ items qualify for tiered volume discounts. Contact us for a custom quote on large orders.',
      },
      {
        question: 'Can I use a coupon code?',
        answer: 'Yes! Enter your coupon code at checkout. Valid codes are automatically applied to your order total.',
      },
    ],
  },
  {
    category: 'Returns & Exchanges',
    icon: '↩️',
    items: [
      {
        question: 'What is your return policy?',
        answer: 'Custom products can only be returned if they differ from the approved proof. Standard products can be returned within 14 days of delivery in original condition.',
      },
      {
        question: 'How do I start a return?',
        answer: 'Contact us with your order number and reason for return. We\'ll provide return instructions and a prepaid return label if applicable.',
      },
      {
        question: 'When will I receive my refund?',
        answer: 'Refunds are processed within 5–10 business days after we receive your returned items. The refund will be credited to your original payment method.',
      },
      {
        question: 'Who pays for return shipping?',
        answer: 'We cover return shipping costs if the item is defective or incorrect. Otherwise, return shipping is the customer\'s responsibility.',
      },
    ],
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // [2025-01-27 19:25:00] 搜索功能
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
  }, [searchQuery]);

  const toggleFaq = (faqId: string) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '32px' }}>
      <header style={{ display: 'grid', gap: '12px', maxWidth: '720px' }}>
        <h1>Help Center</h1>
        <p>
          Find answers fast or contact our team for hands-on support. Browse FAQs, manage orders, and access
          design resources from one place.
        </p>
      </header>

      {/* [2025-01-27 19:25:00] 搜索框 */}
      <div style={{ maxWidth: '720px' }}>
        <input
          type="search"
          placeholder="Search for help..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '16px',
          }}
        />
      </div>

      <section style={{ display: 'grid', gap: '16px' }}>
        <h2>Quick links</h2>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px',
                fontWeight: 600,
                color: '#1f2937',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ff1f3d';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '20px' }}>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* [2025-01-27 19:25:00] 分类 FAQ */}
      {filteredFAQs.map((category) => (
        <section key={category.category} style={{ display: 'grid', gap: '12px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>{category.icon}</span>
            {category.category}
          </h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            {category.items.map((faq, index) => {
              const faqId = `${category.category}-${index}`;
              const isExpanded = expandedFaq === faqId;

              return (
                <article
                  key={index}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => toggleFaq(faqId)}
                    style={{
                      width: '100%',
                      padding: '16px 18px',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: 600,
                      fontSize: '16px',
                      color: '#1f2937',
                    }}
                  >
                    <span>{faq.question}</span>
                    <span style={{ fontSize: '20px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </button>
                  {isExpanded && (
                    <div style={{ padding: '0 18px 16px', color: '#6b7280', lineHeight: 1.6 }}>
                      {faq.answer}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {filteredFAQs.length === 0 && searchQuery && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p>No results found for "{searchQuery}".</p>
          <p style={{ marginTop: '8px' }}>
            Try different keywords or <Link href="/contact" style={{ color: '#ff1f3d', textDecoration: 'underline' }}>contact our support team</Link>.
          </p>
        </div>
      )}

      <section style={{ display: 'grid', gap: '12px', maxWidth: '720px', background: '#f8f9fa', padding: '24px', borderRadius: '12px' }}>
        <h2>Still need help?</h2>
        <p style={{ margin: 0 }}>
          Can't find what you're looking for? Our support team is here to help. Reach out via{' '}
          <Link href="/contact" style={{ color: '#ff1f3d', textDecoration: 'underline' }}>contact form</Link>,{' '}
          email at <a href="mailto:support@suvernireplus.com" style={{ color: '#ff1f3d', textDecoration: 'underline' }}>support@suvernireplus.com</a>, or call us at{' '}
          <a href="tel:8552712660" style={{ color: '#ff1f3d', textDecoration: 'underline' }}>855-271-2660</a>.
        </p>
      </section>
    </section>
  );
}
