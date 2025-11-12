/**
 * Validation Utilities Tests
 * [2025-01-27 11:35:00] 表单验证工具函数测试
 */
import {
  validateEmail,
  validateCanadianPostalCode,
  validateUSPostalCode,
  validatePhone,
  validateRequired,
  validateAddressForm,
  formatCanadianPostalCode,
  formatPhoneNumber,
} from '../validation';

describe('validation utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('invalid@.com')).toBe(false);
    });
  });

  describe('validateCanadianPostalCode', () => {
    it('should validate correct Canadian postal codes', () => {
      expect(validateCanadianPostalCode('A1A 1A1')).toBe(true);
      expect(validateCanadianPostalCode('K1A0B1')).toBe(true);
      expect(validateCanadianPostalCode('M5H 2N2')).toBe(true);
    });

    it('should reject invalid Canadian postal codes', () => {
      expect(validateCanadianPostalCode('12345')).toBe(false);
      expect(validateCanadianPostalCode('ABC123')).toBe(false);
      expect(validateCanadianPostalCode('A1A1A1')).toBe(false);
    });
  });

  describe('validateUSPostalCode', () => {
    it('should validate correct US zip codes', () => {
      expect(validateUSPostalCode('12345')).toBe(true);
      expect(validateUSPostalCode('12345-6789')).toBe(true);
    });

    it('should reject invalid US zip codes', () => {
      expect(validateUSPostalCode('1234')).toBe(false);
      expect(validateUSPostalCode('123456')).toBe(false);
      expect(validateUSPostalCode('ABC12')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone numbers', () => {
      expect(validatePhone('1234567890')).toBe(true);
      expect(validatePhone('(123) 456-7890')).toBe(true);
      expect(validatePhone('123-456-7890')).toBe(true);
      expect(validatePhone('+1 1234567890')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('123456789012')).toBe(false);
      expect(validatePhone('abc')).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should return null for valid values', () => {
      expect(validateRequired('value', 'Field')).toBeNull();
      expect(validateRequired('  value  ', 'Field')).toBeNull();
    });

    it('should return error message for empty values', () => {
      expect(validateRequired('', 'Field')).toBe('Field is required');
      expect(validateRequired('   ', 'Field')).toBe('Field is required');
      expect(validateRequired(null, 'Field')).toBe('Field is required');
      expect(validateRequired(undefined, 'Field')).toBe('Field is required');
    });
  });

  describe('validateAddressForm', () => {
    it('should validate a complete valid address', () => {
      const address = {
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        addressLine1: '123 Main St',
        city: 'Toronto',
        province: 'ON',
        postalCode: 'M5H 2N2',
        country: 'CA',
      };

      const result = validateAddressForm(address);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const address = {
        fullName: '',
        email: '',
        phone: '',
        addressLine1: '',
        city: '',
        province: '',
        postalCode: '',
        country: 'CA',
      };

      const result = validateAddressForm(address);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate email format', () => {
      const address = {
        fullName: 'John Doe',
        email: 'invalid-email',
        phone: '1234567890',
        addressLine1: '123 Main St',
        city: 'Toronto',
        province: 'ON',
        postalCode: 'M5H 2N2',
        country: 'CA',
      };

      const result = validateAddressForm(address);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please enter a valid email address');
    });

    it('should validate Canadian postal code format', () => {
      const address = {
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        addressLine1: '123 Main St',
        city: 'Toronto',
        province: 'ON',
        postalCode: '12345',
        country: 'CA',
      };

      const result = validateAddressForm(address);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please enter a valid Canadian postal code (e.g., A1A 1A1)');
    });
  });

  describe('formatCanadianPostalCode', () => {
    it('should format postal codes correctly', () => {
      expect(formatCanadianPostalCode('A1A1A1')).toBe('A1A 1A1');
      expect(formatCanadianPostalCode('m5h2n2')).toBe('M5H 2N2');
      expect(formatCanadianPostalCode('A1A 1A1')).toBe('A1A 1A1');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 10-digit phone numbers', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
    });

    it('should return original value for non-10-digit numbers', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber('12345678901')).toBe('12345678901');
    });
  });
});

