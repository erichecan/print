/**
 * Help Center Client Component
* 帮助中心客户端组件（处理搜索和交互）
* 原型化帮助中心布局与搜索
* Updated to read content from CMS
* Enhanced search with fuzzy matching and highlighting for Issue #147
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { contentApi } from '@/lib/api';
import type React from 'react';
import GuestBookForm from '@/components/help/GuestBookForm';

// 默认快速链接（向后兼容）
const defaultQuickLinks = [
  { id: 'default-1', label: 'Check order status', href: '/order-tracking', icon: '📦' },
  { id: 'default-2', label: 'Update shipping address', href: '/contact', icon: '📍' },
  { id: 'default-3', label: 'Launch Design Lab', href: '/design-lab', icon: '🎨' },
  { id: 'default-4', label: 'Review return policy', href: '/returns', icon: '↩️' },
  { id: 'default-5', label: 'Shipping information', href: '/shipping-info', icon: '🚚' },
  { id: 'default-6', label: 'Size guide', href: '/size-guide', icon: '📏' },
];

// 默认 FAQ 分类（向后兼容）
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
// Additional FAQ categories for Issue #147
  {
    id: 'default-account',
    category: 'Account & Settings',
    icon: '👤',
    items: [
      {
        id: 'default-account-1',
        question: 'How do I create an account?',
        answer:
          'You can create an account during checkout or by clicking "Sign In" in the top navigation. Creating an account allows you to save designs, track orders, and access order history.',
      },
      {
        id: 'default-account-2',
        question: 'Can I checkout without creating an account?',
        answer:
          'Yes! You can checkout as a guest. However, creating an account makes it easier to track orders and manage your designs.',
      },
      {
        id: 'default-account-3',
        question: 'How do I reset my password?',
        answer:
          'Click "Sign In" and then "Forgot Password". Enter your email address and we\'ll send you a password reset link.',
      },
      {
        id: 'default-account-4',
        question: 'How do I update my account information?',
        answer:
          'Log in to your account and go to "My Account" to update your profile, shipping addresses, and payment methods.',
      },
      {
        id: 'default-account-5',
        question: 'Can I save multiple shipping addresses?',
        answer:
          'Yes! You can save multiple shipping addresses in your account settings. Select the address you want to use during checkout.',
      },
    ],
  },
  {
    id: 'default-troubleshooting',
    category: 'Troubleshooting',
    icon: '🔧',
    items: [
      {
        id: 'default-troubleshooting-1',
        question: 'My design looks different than expected. What should I do?',
        answer:
          'If your design differs from the approved proof, contact us immediately. We\'ll work with you to resolve the issue, which may include a reprint or refund.',
      },
      {
        id: 'default-troubleshooting-2',
        question: 'I haven\'t received my order confirmation email. What should I do?',
        answer:
          'Check your spam folder first. If you still don\'t see it, contact us with your order number and we\'ll resend the confirmation email.',
      },
      {
        id: 'default-troubleshooting-3',
        question: 'The tracking number isn\'t working. What should I do?',
        answer:
          'Tracking numbers may take 24-48 hours to activate in the carrier\'s system. If it\'s been longer, contact us with your order number and we\'ll investigate.',
      },
      {
        id: 'default-troubleshooting-4',
        question: 'I entered the wrong shipping address. Can I change it?',
        answer:
          'Contact us immediately with your order number. If your order hasn\'t shipped yet, we can update the address. Once shipped, we\'ll work with the carrier to redirect the package.',
      },
      {
        id: 'default-troubleshooting-5',
        question: 'My payment was declined. What should I do?',
        answer:
          'Check that your card information is correct and that you have sufficient funds. If the problem persists, contact your bank or try a different payment method.',
      },
      {
        id: 'default-troubleshooting-6',
        question: 'The Design Lab isn\'t loading. How can I fix this?',
        answer:
          'Try clearing your browser cache and cookies, or use a different browser. Make sure JavaScript is enabled. If the problem persists, contact our support team.',
      },
    ],
  },
  {
    id: 'default-quality',
    category: 'Quality & Care',
    icon: '⭐',
    items: [
      {
        id: 'default-quality-1',
        question: 'How do I care for my custom apparel?',
        answer:
          'Follow the care instructions on the garment label. Generally, wash in cold water, tumble dry low, and avoid bleach. For best results, turn garments inside out before washing.',
      },
      {
        id: 'default-quality-2',
        question: 'What is your quality guarantee?',
        answer:
          'We guarantee that your order will match the approved proof. If there\'s a quality issue or error on our part, we\'ll replace or refund your order.',
      },
      {
        id: 'default-quality-3',
        question: 'How long will my custom print last?',
        answer:
          'With proper care, our prints are designed to last the lifetime of the garment. Follow the care instructions to maintain print quality.',
      },
      {
        id: 'default-quality-4',
        question: 'What printing methods do you use?',
        answer:
          'We use various printing methods including screen printing, DTG (Direct-to-Garment), and heat transfer, depending on the design and quantity. Our team selects the best method for your order.',
      },
    ],
  },
  {
    id: 'default-business',
    category: 'Business & Wholesale',
    icon: '🏢',
    items: [
      {
        id: 'default-business-1',
        question: 'Do you offer wholesale pricing?',
        answer:
          'Yes! We offer tiered pricing for bulk orders. Contact us for custom pricing on orders over 500 units or for ongoing business partnerships.',
      },
      {
        id: 'default-business-2',
        question: 'Can I get a custom quote for a large order?',
        answer:
          'Absolutely! Contact our sales team with your order details and we\'ll provide a custom quote with volume discounts.',
      },
      {
        id: 'default-business-3',
        question: 'Do you work with businesses and organizations?',
        answer:
          'Yes! We work with businesses, schools, sports teams, and organizations of all sizes. Contact us to discuss your needs.',
      },
      {
        id: 'default-business-4',
        question: 'Can I set up a business account?',
        answer:
          'Yes! Business accounts offer benefits like net payment terms, dedicated account management, and custom pricing. Contact us to learn more.',
      },
      {
        id: 'default-business-5',
        question: 'Do you offer rush production for business orders?',
        answer:
          'Yes! We offer rush production options for business orders. Contact us to discuss timelines and pricing for urgent orders.',
      },
    ],
  },
];

export default function HelpClient() {
// 从 CMS 获取帮助页内容
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const helpPage = contentData?.data?.helpPage;

// 使用 CMS 数据或默认值（向后兼容）
  const quickLinks = helpPage?.quickLinks || defaultQuickLinks;
  const faqCategories = helpPage?.faqCategories || defaultFaqCategories;

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

// Enhanced search with fuzzy matching and highlighting for Issue #147
  const filteredFAQs = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqCategories;
    }

    const query = searchQuery.toLowerCase().trim();
    const queryWords = query.split(/\s+/).filter(Boolean);
    
    return faqCategories
      .map((category) => {
        const filteredItems = category.items.filter((item) => {
          const questionLower = item.question.toLowerCase();
          const answerLower = item.answer.toLowerCase();
          
          // Exact match (highest priority)
          if (questionLower.includes(query) || answerLower.includes(query)) {
            return true;
          }
          
          // Fuzzy match: all query words must appear somewhere
          return queryWords.every(
            (word) => questionLower.includes(word) || answerLower.includes(word)
          );
        });
        
        return {
          ...category,
          items: filteredItems,
        };
      })
      .filter((category) => category.items.length > 0);
  }, [searchQuery, faqCategories]);

// Highlight search terms in text for Issue #147
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const queryWords = query.trim().split(/\s+/).filter(Boolean);
    if (queryWords.length === 0) return text;
    
    // Create a regex that matches any of the query words
    const regex = new RegExp(`(${queryWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, index) => {
          const isMatch = queryWords.some((word) => part.toLowerCase() === word.toLowerCase());
          return isMatch ? (
            <mark key={index} style={{ backgroundColor: '#fef08a', padding: '0 2px', borderRadius: '2px' }}>
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          );
        })}
      </>
    );
  };

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
              placeholder="Search for help... (e.g., shipping, returns, design)"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                }
              }}
              aria-label="Search help center"
            />
            <button type="button" onClick={() => setSearchQuery('')} style={{ display: searchQuery ? 'block' : 'none' }}>
              Clear
            </button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2>FAQs</h2>
{/* Search results count for Issue #147 */}
            {searchQuery && (
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                Found {filteredFAQs.reduce((sum, cat) => sum + cat.items.length, 0)} result{filteredFAQs.reduce((sum, cat) => sum + cat.items.length, 0) !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
              </p>
            )}
          </div>
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
                          {searchQuery ? highlightText(item.question, searchQuery) : item.question}
                          <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                        </button>
                        {isExpanded ? (
                          <p>{searchQuery ? highlightText(item.answer, searchQuery) : item.answer}</p>
                        ) : (
                          <p>
                            {searchQuery
                              ? highlightText(item.answer.substring(0, 120) + '…', searchQuery)
                              : item.answer.substring(0, 120) + '…'}
                          </p>
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
            <a href="tel:4169166352">416 916 6352</a>.
          </p>
        </section>

{/* 留言本表单 */}
        <GuestBookForm />
      </div>
    </section>
  );
}
