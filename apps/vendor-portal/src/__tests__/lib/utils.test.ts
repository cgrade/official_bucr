import { describe, it, expect } from 'vitest';
import {
  cn,
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime,
  getInitials,
  creditsToNaira,
} from '@/lib/utils';

describe('Utils', () => {
  describe('cn (classNames merger)', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('should merge tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });

    it('should handle undefined and null values', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in NGN', () => {
      const result = formatCurrency(1000);
      expect(result).toContain('1,000');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
    });

    it('should handle large numbers', () => {
      const result = formatCurrency(1000000);
      expect(result).toContain('1,000,000');
    });

    it('should handle decimal numbers', () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain('1,234'); // Keeps decimal formatting
    });
  });

  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const result = formatDate('2024-01-15');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should format Date object correctly', () => {
      const result = formatDate(new Date('2024-01-15'));
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('formatTime', () => {
    it('should format time string correctly', () => {
      const result = formatTime('2024-01-15T14:30:00');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should format Date object correctly', () => {
      const result = formatTime(new Date('2024-01-15T14:30:00'));
      expect(result).toBeTruthy();
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime string correctly', () => {
      const result = formatDateTime('2024-01-15T14:30:00');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should format Date object correctly', () => {
      const result = formatDateTime(new Date('2024-01-15T14:30:00'));
      expect(result).toBeTruthy();
    });
  });

  describe('getInitials', () => {
    it('should get initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('should handle single name', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('should handle multiple names (max 2 initials)', () => {
      expect(getInitials('John Michael Doe')).toBe('JM');
    });

    it('should uppercase initials', () => {
      expect(getInitials('john doe')).toBe('JD');
    });
  });

  describe('creditsToNaira', () => {
    it('should convert credits to naira (1 credit = ₦10)', () => {
      expect(creditsToNaira(10)).toBe(100);
    });

    it('should handle zero credits', () => {
      expect(creditsToNaira(0)).toBe(0);
    });

    it('should handle large credit amounts', () => {
      expect(creditsToNaira(1000)).toBe(10000); // 1 credit = ₦10
    });
  });
});
