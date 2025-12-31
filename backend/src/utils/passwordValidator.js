/**
 * Password Validator Utility
* Password strength validation utility
 */

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{ valid: boolean, strength: string, errors: string[] }} Validation result
 */
function validatePasswordStrength(password) {
  const errors = [];
  let strength = 'weak';

  // Minimum length
  if (password.length < 8) {
    errors.push('密码长度至少为 8 个字符');
  }

  // Maximum length (prevent DoS)
  if (password.length > 128) {
    errors.push('密码长度不能超过 128 个字符');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符 (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  // Calculate strength
  if (errors.length === 0) {
    if (password.length >= 12) {
      strength = 'strong';
    } else {
      strength = 'medium';
    }
  }

  return {
    valid: errors.length === 0,
    strength,
    errors,
  };
}

/**
 * Get password strength description
 * @param {string} strength - Password strength (weak, medium, strong)
 * @returns {string} Description
 */
function getPasswordStrengthDescription(strength) {
  const descriptions = {
    weak: '弱',
    medium: '中等',
    strong: '强',
  };
  return descriptions[strength] || '未知';
}

module.exports = {
  validatePasswordStrength,
  getPasswordStrengthDescription,
};

