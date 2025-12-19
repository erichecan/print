/**
 * Contact Client Component
 * [2025-01-27 19:20:00] 联系页面客户端组件（处理表单提交）
 * [2025-12-19 03:00:00] 修复：使用与留言本相同的 API，在 admin 后台显示通知
 */
"use client";

import { useState } from 'react';
import { apiPost } from '@/lib/apiClient';

export default function ContactClient() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    orderNumber: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // [2025-12-19 03:00:00] 使用与留言本相同的 API，保存到数据库并在 admin 后台显示通知
      await apiPost('/api/guest-messages', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        subject: formData.subject || undefined,
        message: formData.message,
        orderNumber: formData.orderNumber || undefined,
      });

      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        orderNumber: '',
      });
    } catch (err: unknown) { // [2025-12-07 02:30:00] Issue #105 - Replace any with unknown for type safety
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit contact form. Please try again.';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '32px', maxWidth: '720px' }}>
      <header style={{ display: 'grid', gap: '12px' }}>
        <h1>Contact Suvernire Plus</h1>
        <p>
          Need help with an order, artwork, or shipping update? Our merch specialists are ready to jump in.
          Reach us by phone, email, or live chat seven days a week.
        </p>
      </header>

      <section style={{ display: 'grid', gap: '16px' }}>
        <h2>Support channels</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
          <li>
            <strong>Phone:</strong> <a href="tel:4169166352">416 916 6352</a> (Mon–Fri, 8am–8pm ET)
          </li>
          <li>
            <strong>Email:</strong> <a href="mailto:support@suvernireplus.com">support@suvernireplus.com</a> (responses within 24 hours)
          </li>
          <li>
            <strong>Live chat:</strong> Available in the Design Lab and Help Center for real-time collaboration.
          </li>
        </ul>
      </section>

      {/* [2025-01-27 19:20:00] 联系表单 */}
      <section style={{ display: 'grid', gap: '16px', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
        <h2>Send us a message</h2>
        {submitted ? (
          <div style={{ background: '#e8f5e9', padding: '16px', borderRadius: '8px', color: '#2e7d32' }}>
            <strong>Thank you for contacting us!</strong>
            <p style={{ margin: '8px 0 0' }}>We&apos;ll get back to you within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="name" style={{ fontWeight: 500 }}>
                Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="email" style={{ fontWeight: 500 }}>
                Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="phone" style={{ fontWeight: 500 }}>Phone</label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="subject" style={{ fontWeight: 500 }}>Subject</label>
              <input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Order inquiry, Design help, Shipping question"
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="orderNumber" style={{ fontWeight: 500 }}>Order Number (if applicable)</label>
              <input
                type="text"
                id="orderNumber"
                value={formData.orderNumber}
                onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="message" style={{ fontWeight: 500 }}>
                Message <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                id="message"
                required
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            {error && (
              <div style={{ background: '#fee', padding: '12px', borderRadius: '6px', color: '#c33' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn"
              style={{
                padding: '12px 24px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </section>

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>Mailing address</h2>
        <address style={{ fontStyle: 'normal', lineHeight: 1.6, color: '#374151' }}>
          Suvernire Plus<br />
          250 Front Street W, Suite 1200<br />
          Toronto, ON M5V 3G5<br />
          Canada
        </address>
      </section>

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>Project consultations</h2>
        <p>
          Planning a large order? Book a 30-minute session with our creative team to review materials,
          pricing tiers, and fulfillment timelines tailored to your organization.
        </p>
      </section>
    </section>
  );
}

