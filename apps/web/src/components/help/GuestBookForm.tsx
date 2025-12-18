/**
 * Guest Book Form Component
 * [2025-12-10 00:00:00] 留言本表单组件 - 用于 help center
 */
'use client';

import { useState, FormEvent } from 'react';
import { apiPost } from '@/lib/apiClient';

interface GuestBookFormProps {
  onSuccess?: () => void;
}

export default function GuestBookForm({ onSuccess }: GuestBookFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    orderNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // [2025-12-18 23:20:00] 修复：使用完整的 API 路径 /api/guest-messages
      await apiPost('/api/guest-messages', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        subject: formData.subject || undefined,
        message: formData.message,
        orderNumber: formData.orderNumber || undefined,
      });

      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        orderNumber: '',
      });

      if (onSuccess) {
        onSuccess();
      }

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit message. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="guest-book" id="guestbook" style={{ marginTop: '3rem', padding: '2rem', background: '#f8fafc', borderRadius: '8px' }}>
      <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Leave a Message</h2>
      <p style={{ marginBottom: '1.5rem', color: '#64748b' }}>
        Have a question or need help? Leave us a message and we&apos;ll get back to you as soon as possible.
      </p>

      {success && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '1.5rem', 
          background: '#d1fae5', 
          border: '1px solid #10b981', 
          borderRadius: '4px',
          color: '#065f46'
        }}>
          ✅ Message submitted successfully! We&apos;ll get back to you soon.
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '1.5rem', 
          background: '#fee2e2', 
          border: '1px solid #ef4444', 
          borderRadius: '4px',
          color: '#991b1b'
        }}>
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>
          <div>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Email <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>
          <div>
            <label htmlFor="orderNumber" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Order Number (if applicable)
            </label>
            <input
              type="text"
              id="orderNumber"
              name="orderNumber"
              value={formData.orderNumber}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="subject" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Subject
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="e.g., Order inquiry, Design help, Shipping question"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
        </div>

        <div>
          <label htmlFor="message" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Message <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            value={formData.message}
            onChange={handleChange}
            placeholder="Tell us how we can help you..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '1rem',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '0.75rem 1.5rem',
            background: isSubmitting ? '#9ca3af' : '#ff1f3d',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Message'}
        </button>
      </form>
    </section>
  );
}

