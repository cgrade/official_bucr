import { describe, it, expect } from 'vitest';
import {
  generateReferralCode,
  generateSlug,
  generateReservationReference,
  generateOrderReference,
  formatCurrency,
  creditsToNaira,
  nairaToCredits,
} from '@/lib/utils/helpers';

describe('Helper Utilities', () => {
  describe('generateReferralCode', () => {
    it('should generate a code with REF- prefix', () => {
      const code = generateReferralCode();
      expect(code).toMatch(/^REF-[A-Z0-9]+$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateReferralCode());
      }
      expect(codes.size).toBe(100);
    });

    it('should generate codes of consistent length', () => {
      const code = generateReferralCode();
      expect(code.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('generateSlug', () => {
    it('should convert to lowercase', () => {
      expect(generateSlug('Test Restaurant')).toMatch(/^test-restaurant/);
    });

    it('should replace spaces with hyphens', () => {
      const slug = generateSlug('My Test Place');
      expect(slug).toContain('my-test-place');
    });

    it('should remove special characters', () => {
      const slug = generateSlug("John's Café & Bar!");
      expect(slug).not.toContain("'");
      expect(slug).not.toContain('&');
      expect(slug).not.toContain('!');
    });

    it('should append unique suffix', () => {
      const slug1 = generateSlug('Test');
      const slug2 = generateSlug('Test');
      expect(slug1).not.toBe(slug2);
    });
  });

  describe('generateReservationReference', () => {
    it('should generate reference with BKR- prefix', () => {
      const ref = generateReservationReference();
      expect(ref).toMatch(/^BKR-[A-Z0-9]+-[A-Z0-9]+$/);
    });

    it('should generate unique references', () => {
      const refs = new Set<string>();
      for (let i = 0; i < 50; i++) {
        refs.add(generateReservationReference());
      }
      expect(refs.size).toBe(50);
    });
  });

  describe('generateOrderReference', () => {
    it('should generate reference with ORD- prefix', () => {
      const ref = generateOrderReference();
      expect(ref).toMatch(/^ORD-[A-Z0-9]+-[A-Z0-9]+$/);
    });

    it('should generate unique references', () => {
      const refs = new Set<string>();
      for (let i = 0; i < 50; i++) {
        refs.add(generateOrderReference());
      }
      expect(refs.size).toBe(50);
    });
  });

  describe('formatCurrency', () => {
    it('should format amount in Naira', () => {
      const formatted = formatCurrency(100000); // 1000 Naira in kobo
      expect(formatted).toContain('1,000');
      expect(formatted).toContain('₦');
    });

    it('should handle zero', () => {
      const formatted = formatCurrency(0);
      expect(formatted).toContain('0');
    });

    it('should handle decimal amounts', () => {
      const formatted = formatCurrency(12345);
      expect(formatted).toContain('123.45');
    });
  });

  describe('creditsToNaira', () => {
    it('should convert credits to Naira value (1 credit = ₦100)', () => {
      expect(creditsToNaira(100)).toBe(10000); // 100 credits = ₦10,000
      expect(creditsToNaira(50)).toBe(5000);
      expect(creditsToNaira(1)).toBe(100);
    });

    it('should handle zero credits', () => {
      expect(creditsToNaira(0)).toBe(0);
    });
  });

  describe('nairaToCredits', () => {
    it('should convert Naira to credits (₦100 = 1 credit)', () => {
      expect(nairaToCredits(10000)).toBe(100); // ₦10,000 = 100 credits
      expect(nairaToCredits(5000)).toBe(50);
      expect(nairaToCredits(100)).toBe(1);
    });

    it('should handle zero Naira', () => {
      expect(nairaToCredits(0)).toBe(0);
    });

    it('should floor partial credits', () => {
      expect(nairaToCredits(150)).toBe(1); // ₦150 = 1.5 credits, floors to 1
    });
  });
});
