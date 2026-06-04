/**
 * Form Validation Utilities
* 统一的表单验证工具函数
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证加拿大邮政编码
 */
export function validateCanadianPostalCode(postalCode: string): boolean {
  const canadianPostalRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
  return canadianPostalRegex.test(postalCode.replace(/\s/g, ''));
}

/**
 * 验证美国邮政编码
 */
export function validateUSPostalCode(postalCode: string): boolean {
  const usPostalRegex = /^\d{5}(-\d{4})?$/;
  return usPostalRegex.test(postalCode);
}

/**
 * 验证加拿大/北美电话号码
 * 规则：去掉非数字后共 10 位（或带 1 的 11 位）
 *   - 区号首位必须为 2-9（不能是 0 或 1）
 *   - 局号首位必须为 2-9
 * 合法示例：(416) 555-1234、1-800-555-0199、+1 604 123 4567
 */
export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  let local = digits;
  if (digits.length === 11) {
    if (digits[0] !== '1') return false;
    local = digits.slice(1);
  }
  if (local.length !== 10) return false;
  // 区号首位 2-9，局号首位 2-9
  if (local[0] < '2' || local[3] < '2') return false;
  return true;
}

/**
 * 验证必填字段
 */
export function validateRequired(value: string | undefined | null, fieldName: string): string | null {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * 验证地址表单
 */
export interface AddressForm {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export function validateAddressForm(address: AddressForm): ValidationResult {
  const errors: string[] = [];

  // 验证必填字段
  const fullNameError = validateRequired(address.fullName, 'Full name');
  if (fullNameError) errors.push(fullNameError);

  const emailError = validateRequired(address.email, 'Email');
  if (emailError) {
    errors.push(emailError);
  } else if (!validateEmail(address.email)) {
    errors.push('Please enter a valid email address');
  }

  const phoneError = validateRequired(address.phone, 'Phone');
  if (phoneError) {
    errors.push(phoneError);
  } else if (!validatePhone(address.phone)) {
    errors.push('Please enter a valid phone number');
  }

  const addressError = validateRequired(address.addressLine1, 'Street address');
  if (addressError) errors.push(addressError);

  const cityError = validateRequired(address.city, 'City');
  if (cityError) errors.push(cityError);

  const provinceError = validateRequired(address.province, 'Province/State');
  if (provinceError) errors.push(provinceError);

  const postalCodeError = validateRequired(address.postalCode, 'Postal code');
  if (postalCodeError) {
    errors.push(postalCodeError);
  } else {
    // 根据国家验证邮政编码
    if (address.country === 'CA' && !validateCanadianPostalCode(address.postalCode)) {
      errors.push('Please enter a valid Canadian postal code (e.g., A1A 1A1)');
    } else if (address.country === 'US' && !validateUSPostalCode(address.postalCode)) {
      errors.push('Please enter a valid US zip code (e.g., 12345 or 12345-6789)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 格式化加拿大邮政编码
 */
export function formatCanadianPostalCode(postalCode: string): string {
  const cleaned = postalCode.replace(/\s+/g, '').toUpperCase();
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  return cleaned;
}

/**
 * 格式化加拿大电话号码为 (XXX) XXX-XXXX
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
  if (local.length === 10) {
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return phone;
}

