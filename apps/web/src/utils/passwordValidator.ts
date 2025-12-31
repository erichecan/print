/**
 * Password Validator Utility
* Password strength validation utility for frontend
 */

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface PasswordValidationResult {
  valid: boolean;
  strength: PasswordStrength;
  errors: string[];
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const requirements = {
    length: password.length >= 8 && password.length <= 128,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  if (!requirements.length) {
    errors.push('密码长度至少为 8 个字符，最多 128 个字符');
  }
  if (!requirements.uppercase) {
    errors.push('密码必须包含至少一个大写字母');
  }
  if (!requirements.lowercase) {
    errors.push('密码必须包含至少一个小写字母');
  }
  if (!requirements.number) {
    errors.push('密码必须包含至少一个数字');
  }
  if (!requirements.special) {
    errors.push('密码必须包含至少一个特殊字符 (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  let strength: PasswordStrength = 'weak';
  if (errors.length === 0) {
    strength = password.length >= 12 ? 'strong' : 'medium';
  }

  return {
    valid: errors.length === 0,
    strength,
    errors,
    requirements,
  };
}

/**
 * Get password strength description
 */
export function getPasswordStrengthDescription(strength: PasswordStrength): string {
  const descriptions = {
    weak: '弱',
    medium: '中等',
    strong: '强',
  };
  return descriptions[strength] || '未知';
}

/**
 * Get password strength color
 */
export function getPasswordStrengthColor(strength: PasswordStrength): string {
  const colors = {
    weak: '#ff1f3d',
    medium: '#ffa500',
    strong: '#1f7d3d',
  };
  return colors[strength] || '#666';
}

