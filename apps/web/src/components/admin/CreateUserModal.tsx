/**
 * Create User Modal Component
 * [2025-01-28 18:40:00] 创建/邀请用户的模态框组件
 */
'use client';

import { useState, FormEvent } from 'react';
import { adminUsersApi, AdminCreateUserPayload } from '@/lib/api';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AdminCreateUserPayload>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'CUSTOMER',
    emailVerified: false,
  });

  // [2025-01-28 18:40:00] 处理表单提交
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // [2025-01-28 18:40:00] 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // [2025-01-28 18:40:00] 如果提供了密码，验证密码长度
      if (formData.password && formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }

      // [2025-01-28 18:40:00] 准备提交数据（移除空字符串）
      const payload: AdminCreateUserPayload = {
        email: formData.email.trim(),
        role: formData.role || 'CUSTOMER',
        emailVerified: formData.emailVerified || false,
      };

      if (formData.password) {
        payload.password = formData.password;
      }
      if (formData.firstName?.trim()) {
        payload.firstName = formData.firstName.trim();
      }
      if (formData.lastName?.trim()) {
        payload.lastName = formData.lastName.trim();
      }
      if (formData.phone?.trim()) {
        payload.phone = formData.phone.trim();
      }

      // [2025-01-28 18:40:00] 调用 API 创建用户
      await adminUsersApi.create(payload);

      // [2025-01-28 18:40:00] 重置表单并关闭模态框
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'CUSTOMER',
        emailVerified: false,
      });
      setError(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[CreateUserModal] Failed to create user:', err);
      setError(err.message || 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // [2025-01-28 18:40:00] 处理输入变化
  const handleChange = (field: keyof AdminCreateUserPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null); // 清除错误信息
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Add New User</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal__body">
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              id="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              placeholder="user@example.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password <span className="text-muted">(Optional - auto-generated if empty)</span>
            </label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Leave empty to generate temporary password"
              disabled={loading}
              minLength={8}
            />
            <small className="form-text text-muted">Minimum 8 characters. Leave empty to send invitation email.</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">First Name</label>
              <input
                type="text"
                id="firstName"
                className="form-control"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="John"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName" className="form-label">Last Name</label>
              <input
                type="text"
                id="lastName"
                className="form-control"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Doe"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">Phone</label>
            <input
              type="tel"
              id="phone"
              className="form-control"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="role" className="form-label">Role</label>
              <select
                id="role"
                className="form-control"
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value as 'CUSTOMER' | 'ADMIN')}
                disabled={loading}
              >
                <option value="CUSTOMER">Customer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Account Status</label>
              <div className="form-check">
                <input
                  type="checkbox"
                  id="emailVerified"
                  className="form-check-input"
                  checked={formData.emailVerified || false}
                  onChange={(e) => handleChange('emailVerified', e.target.checked)}
                  disabled={loading}
                />
                <label htmlFor="emailVerified" className="form-check-label">
                  Email Verified (Active)
                </label>
              </div>
              <small className="form-text text-muted">
                Check to activate account immediately. Unchecked users will need to verify email.
              </small>
            </div>
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

