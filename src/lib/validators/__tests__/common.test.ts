import { describe, it, expect } from 'vitest';
import {
  paginationSchema,
  emailSchema,
  phoneSchema,
  dateRangeSchema,
  priceSchema,
  ratingSchema,
  slugSchema,
  coordinatesSchema,
  sanitizeString,
} from '../common';

describe('Common Validators', () => {
  describe('paginationSchema', () => {
    it('should validate valid pagination params', () => {
      const result = paginationSchema.parse({
        page: '2',
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result).toEqual({
        page: 2,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should use defaults for missing params', () => {
      const result = paginationSchema.parse({});
      
      expect(result).toEqual({
        page: 1,
        limit: 20,
        sortOrder: 'desc',
      });
    });

    it('should reject invalid values', () => {
      expect(() => paginationSchema.parse({ page: '0' })).toThrow();
      expect(() => paginationSchema.parse({ limit: '101' })).toThrow();
      expect(() => paginationSchema.parse({ sortOrder: 'invalid' })).toThrow();
    });
  });

  describe('emailSchema', () => {
    it('should validate valid emails', () => {
      expect(emailSchema.parse('test@example.com')).toBe('test@example.com');
      expect(emailSchema.parse('USER@EXAMPLE.COM')).toBe('user@example.com');
    });

    it('should reject invalid emails', () => {
      expect(() => emailSchema.parse('not-an-email')).toThrow();
      expect(() => emailSchema.parse('@example.com')).toThrow();
      expect(() => emailSchema.parse('test@')).toThrow();
    });
  });

  describe('phoneSchema', () => {
    it('should validate Nigerian phone numbers', () => {
      expect(phoneSchema.parse('+2348012345678')).toBe('+2348012345678');
      expect(phoneSchema.parse('08012345678')).toBe('08012345678');
      expect(phoneSchema.parse('+2349012345678')).toBe('+2349012345678');
    });

    it('should reject invalid phone numbers', () => {
      expect(() => phoneSchema.parse('123456')).toThrow();
      expect(() => phoneSchema.parse('+1234567890')).toThrow();
      expect(() => phoneSchema.parse('0801234567')).toThrow(); // Too short
    });
  });

  describe('dateRangeSchema', () => {
    it('should validate valid date ranges', () => {
      const result = dateRangeSchema.parse({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
    });

    it('should allow optional dates', () => {
      const result = dateRangeSchema.parse({});
      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBeUndefined();
    });

    it('should reject invalid date ranges', () => {
      expect(() => dateRangeSchema.parse({
        startDate: '2024-12-31',
        endDate: '2024-01-01',
      })).toThrow('Start date must be before end date');
    });
  });

  describe('priceSchema', () => {
    it('should validate valid prices', () => {
      expect(priceSchema.parse(0)).toBe(0);
      expect(priceSchema.parse(1000)).toBe(1000);
      expect(priceSchema.parse(999999)).toBe(999999);
    });

    it('should reject invalid prices', () => {
      expect(() => priceSchema.parse(-1)).toThrow();
      expect(() => priceSchema.parse(10.5)).toThrow(); // Must be integer
      expect(() => priceSchema.parse('100')).toThrow(); // Must be number
    });
  });

  describe('ratingSchema', () => {
    it('should validate valid ratings', () => {
      expect(ratingSchema.parse(1)).toBe(1);
      expect(ratingSchema.parse(3)).toBe(3);
      expect(ratingSchema.parse(5)).toBe(5);
    });

    it('should reject invalid ratings', () => {
      expect(() => ratingSchema.parse(0)).toThrow();
      expect(() => ratingSchema.parse(6)).toThrow();
      expect(() => ratingSchema.parse(3.5)).toThrow(); // Must be integer
    });
  });

  describe('slugSchema', () => {
    it('should validate valid slugs', () => {
      expect(slugSchema.parse('valid-slug')).toBe('valid-slug');
      expect(slugSchema.parse('slug-123')).toBe('slug-123');
      expect(slugSchema.parse('another-valid-slug-here')).toBe('another-valid-slug-here');
    });

    it('should reject invalid slugs', () => {
      expect(() => slugSchema.parse('Invalid Slug')).toThrow();
      expect(() => slugSchema.parse('slug_with_underscore')).toThrow();
      expect(() => slugSchema.parse('UPPERCASE')).toThrow();
      expect(() => slugSchema.parse('ab')).toThrow(); // Too short
    });
  });

  describe('coordinatesSchema', () => {
    it('should validate valid coordinates', () => {
      const result = coordinatesSchema.parse({
        lat: 6.5244,
        lng: 3.3792,
      });

      expect(result).toEqual({
        lat: 6.5244,
        lng: 3.3792,
      });
    });

    it('should reject invalid coordinates', () => {
      expect(() => coordinatesSchema.parse({ lat: 91, lng: 0 })).toThrow();
      expect(() => coordinatesSchema.parse({ lat: -91, lng: 0 })).toThrow();
      expect(() => coordinatesSchema.parse({ lat: 0, lng: 181 })).toThrow();
      expect(() => coordinatesSchema.parse({ lat: 0, lng: -181 })).toThrow();
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize strings', () => {
      expect(sanitizeString('  test  ')).toBe('test');
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeString('a'.repeat(2000))).toHaveLength(1000);
    });
  });
});
