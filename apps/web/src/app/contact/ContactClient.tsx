/**
 * Contact Client Component
 * [2025-01-27 19:20:00] 联系页面客户端组件（处理表单提交）
 * [2025-12-07 02:00:00] Issue #176 - 优化表单验证、样式和提交反馈
 */
"use client";

import { useState, useEffect } from 'react';
import { contactApi } from '@/lib/api';
import { validateEmail, validatePhone } from '@/utils/validation';

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

export default function ContactClient() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    orderNumber: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // [2025-12-07 02:00:00] 实时验证函数
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'name':
        if (!value.trim()) {
          return 'Name is required';
        }
        if (value.trim().length < 2) {
          return 'Name must be at least 2 characters';
        }
        if (value.trim().length > 100) {
          return 'Name must be less than 100 characters';
        }
        break;
      case 'email':
        if (!value.trim()) {
          return 'Email is required';
        }
        if (!validateEmail(value)) {
          return 'Please enter a valid email address';
        }
        break;
      case 'phone':
        if (value.trim() && !validatePhone(value)) {
          return 'Please enter a valid phone number';
        }
        break;
      case 'message':
        if (!value.trim()) {
          return 'Message is required';
        }
        if (value.trim().length < 10) {
          return 'Message must be at least 10 characters';
        }
        if (value.trim().length > 5000) {
          return 'Message must be less than 5000 characters';
        }
        break;
      case 'subject':
        if (value.trim().length > 200) {
          return 'Subject must be less than 200 characters';
        }
        break;
      case 'orderNumber':
        if (value.trim().length > 50) {
          return 'Order number must be less than 50 characters';
        }
        break;
    }
    return undefined;
  };

  // [2025-12-07 02:00:00] 处理字段变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // 如果字段已被触摸过，实时验证
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  // [2025-12-07 02:00:00] 处理字段失焦
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // [2025-12-07 02:00:00] 验证整个表单
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // 验证所有必填字段
    ['name', 'email', 'message'].forEach((field) => {
      const error = validateField(field, formData[field as keyof typeof formData]);
      if (error) {
        newErrors[field as keyof FormErrors] = error;
        isValid = false;
      }
    });

    // 验证可选字段（如果已填写）
    ['phone', 'subject', 'orderNumber'].forEach((field) => {
      const value = formData[field as keyof typeof formData];
      if (value.trim()) {
        const error = validateField(field, value);
        if (error) {
          newErrors[field as keyof FormErrors] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    // 标记所有字段为已触摸
    setTouched({
      name: true,
      email: true,
      phone: true,
      subject: true,
      message: true,
      orderNumber: true,
    });

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      // 滚动到第一个错误字段
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element?.focus();
      }
      return;
    }

    setSubmitting(true);

    try {
      await contactApi.submit({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        subject: formData.subject.trim() || undefined,
        message: formData.message.trim(),
        orderNumber: formData.orderNumber.trim() || undefined,
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
      setErrors({});
      setTouched({});

      // [2025-12-07 02:00:00] 3秒后自动滚动到成功消息
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to submit contact form. Please try again.';
      setSubmitError(errorMessage);
      
      // 滚动到错误消息
      setTimeout(() => {
        const errorElement = document.querySelector('[data-error-message]');
        errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } finally {
      setSubmitting(false);
    }
  };

  // [2025-12-07 02:00:00] 字符计数
  const messageLength = formData.message.length;
  const maxMessageLength = 5000;

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
            <strong>Phone:</strong> <a href="tel:8552712660">855-271-2660</a> (Mon–Fri, 8am–8pm ET)
          </li>
          <li>
            <strong>Email:</strong> <a href="mailto:support@suvernireplus.com">support@suvernireplus.com</a> (responses within 24 hours)
          </li>
          <li>
            <strong>Live chat:</strong> Available in the Design Lab and Help Center for real-time collaboration.
          </li>
        </ul>
      </section>

      {/* [2025-12-07 02:00:00] Issue #176 - 优化后的联系表单 */}
      <section
        style={{
          display: 'grid',
          gap: '20px',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          padding: '32px',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 600 }}>Send us a message</h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Fill out the form below and we&apos;ll get back to you within 24 hours.
          </p>
        </div>

        {submitted ? (
          <div
            style={{
              background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #81c784',
              display: 'grid',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#4caf50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '18px', color: '#2e7d32', marginBottom: '4px' }}>
                  Thank you for contacting us!
                </strong>
                <p style={{ margin: 0, color: '#2e7d32', fontSize: '14px' }}>
                  We&apos;ve received your message and will get back to you within 24 hours.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setSubmitError(null);
              }}
              style={{
                marginTop: '8px',
                padding: '10px 20px',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '14px',
                alignSelf: 'flex-start',
              }}
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
            {/* [2025-12-07 02:00:00] 错误消息显示 */}
            {submitError && (
              <div
                data-error-message
                style={{
                  background: '#fee',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #fcc',
                  color: '#c33',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <span>{submitError}</span>
              </div>
            )}

            {/* Name Field */}
            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="name" style={{ fontWeight: 500, fontSize: '14px', color: '#374151' }}>
                Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'name-error' : undefined}
                style={{
                  padding: '12px 16px',
                  border: errors.name ? '2px solid #ef4444' : touched.name ? '2px solid #10b981' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  outline: 'none',
                  ...(errors.name
                    ? {}
                    : touched.name
                      ? { boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)' }
                      : {}),
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = errors.name ? '#ef4444' : '#3b82f6';
                  e.target.style.boxShadow = errors.name ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  handleBlur(e);
                  e.target.style.borderColor = errors.name ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {errors.name && (
                <span id="name-error" style={{ color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠️</span> {errors.name}
                </span>
              )}
            </div>

            {/* Email Field */}
            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="email" style={{ fontWeight: 500, fontSize: '14px', color: '#374151' }}>
                Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                style={{
                  padding: '12px 16px',
                  border: errors.email ? '2px solid #ef4444' : touched.email ? '2px solid #10b981' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  outline: 'none',
                  ...(errors.email
                    ? {}
                    : touched.email
                      ? { boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)' }
                      : {}),
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = errors.email ? '#ef4444' : '#3b82f6';
                  e.target.style.boxShadow = errors.email ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  handleBlur(e);
                  e.target.style.borderColor = errors.email ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {errors.email && (
                <span id="email-error" style={{ color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠️</span> {errors.email}
                </span>
              )}
            </div>

            {/* Phone Field */}
            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="phone" style={{ fontWeight: 500, fontSize: '14px', color: '#374151' }}>
                Phone <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g., (555) 123-4567"
                aria-invalid={errors.phone ? 'true' : 'false'}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                style={{
                  padding: '12px 16px',
                  border: errors.phone ? '2px solid #ef4444' : touched.phone && !errors.phone ? '2px solid #10b981' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  outline: 'none',
                  ...(errors.phone
                    ? {}
                    : touched.phone && !errors.phone
                      ? { boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)' }
                      : {}),
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = errors.phone ? '#ef4444' : '#3b82f6';
                  e.target.style.boxShadow = errors.phone ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  handleBlur(e);
                  e.target.style.borderColor = errors.phone ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {errors.phone && (
                <span id="phone-error" style={{ color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠️</span> {errors.phone}
                </span>
              )}
            </div>

            {/* Subject Field */}
            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="subject" style={{ fontWeight: 500, fontSize: '14px', color: '#374151' }}>
                Subject <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g., Order inquiry, Design help, Shipping question"
                maxLength={200}
                aria-invalid={errors.subject ? 'true' : 'false'}
                aria-describedby={errors.subject ? 'subject-error' : undefined}
                style={{
                  padding: '12px 16px',
                  border: errors.subject ? '2px solid #ef4444' : touched.subject && !errors.subject ? '2px solid #10b981' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  outline: 'none',
                  ...(errors.subject
                    ? {}
                    : touched.subject && !errors.subject
                      ? { boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)' }
                      : {}),
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = errors.subject ? '#ef4444' : '#3b82f6';
                  e.target.style.boxShadow = errors.subject ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  handleBlur(e);
                  e.target.style.borderColor = errors.subject ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {errors.subject && (
                <span id="subject-error" style={{ color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠️</span> {errors.subject}
                </span>
              )}
              {touched.subject && !errors.subject && formData.subject && (
                <span style={{ color: '#6b7280', fontSize: '12px' }}>
                  {formData.subject.length} / 200 characters
                </span>
              )}
            </div>

            {/* Order Number Field */}
            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="orderNumber" style={{ fontWeight: 500, fontSize: '14px', color: '#374151' }}>
                Order Number <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                id="orderNumber"
                name="orderNumber"
                value={formData.orderNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g., ORD-12345"
                maxLength={50}
                aria-invalid={errors.orderNumber ? 'true' : 'false'}
                aria-describedby={errors.orderNumber ? 'orderNumber-error' : undefined}
                style={{
                  padding: '12px 16px',
                  border: errors.orderNumber ? '2px solid #ef4444' : touched.orderNumber && !errors.orderNumber ? '2px solid #10b981' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  outline: 'none',
                  ...(errors.orderNumber
                    ? {}
                    : touched.orderNumber && !errors.orderNumber
                      ? { boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)' }
                      : {}),
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = errors.orderNumber ? '#ef4444' : '#3b82f6';
                  e.target.style.boxShadow = errors.orderNumber ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  handleBlur(e);
                  e.target.style.borderColor = errors.orderNumber ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {errors.orderNumber && (
                <span id="orderNumber-error" style={{ color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠️</span> {errors.orderNumber}
                </span>
              )}
            </div>

            {/* Message Field */}
            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="message" style={{ fontWeight: 500, fontSize: '14px', color: '#374151' }}>
                Message <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                value={formData.message}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength={maxMessageLength}
                aria-invalid={errors.message ? 'true' : 'false'}
                aria-describedby={errors.message ? 'message-error' : undefined}
                style={{
                  padding: '12px 16px',
                  border: errors.message ? '2px solid #ef4444' : touched.message ? '2px solid #10b981' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  outline: 'none',
                  minHeight: '120px',
                  ...(errors.message
                    ? {}
                    : touched.message
                      ? { boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)' }
                      : {}),
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = errors.message ? '#ef4444' : '#3b82f6';
                  e.target.style.boxShadow = errors.message ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  handleBlur(e);
                  e.target.style.borderColor = errors.message ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {errors.message ? (
                  <span id="message-error" style={{ color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>⚠️</span> {errors.message}
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    Minimum 10 characters required
                  </span>
                )}
                <span
                  style={{
                    fontSize: '12px',
                    color: messageLength > maxMessageLength * 0.9 ? '#ef4444' : '#6b7280',
                    fontWeight: messageLength > maxMessageLength * 0.9 ? 500 : 400,
                  }}
                >
                  {messageLength} / {maxMessageLength} characters
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '14px 28px',
                fontWeight: 600,
                fontSize: '16px',
                background: submitting ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s, transform 0.1s, box-shadow 0.2s',
                boxShadow: submitting ? 'none' : '0 2px 4px rgba(59, 130, 246, 0.2)',
                ...(submitting
                  ? {}
                  : {
                      ':hover': { background: '#2563eb' },
                    }),
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.background = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.currentTarget.style.background = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                }
              }}
            >
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                  Sending...
                </span>
              ) : (
                'Send Message'
              )}
            </button>

            <style jsx>{`
              @keyframes spin {
                to {
                  transform: rotate(360deg);
                }
              }
            `}</style>
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
