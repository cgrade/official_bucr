import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SamePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle special characters', async () => {
      const password = 'P@$$w0rd!#$%^&*()';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should handle unicode characters', async () => {
      const password = 'パスワード123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
    });

    it('should handle empty string', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('WrongPassword123!', hash);
      expect(isValid).toBe(false);
    });

    it('should reject similar but different password', async () => {
      const password = 'Password123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('Password123', hash); // Missing !
      expect(isValid).toBe(false);
    });

    it('should be case sensitive', async () => {
      const password = 'CaseSensitive123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('casesensitive123!', hash);
      expect(isValid).toBe(false);
    });

    it('should handle special characters correctly', async () => {
      const password = 'Test!@#$%^&*()_+';
      const hash = await hashPassword(password);
      
      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword('Test!@#$%^&*()_', hash)).toBe(false);
    });
  });

  describe('Security Properties', () => {
    it('hash should start with bcrypt prefix', async () => {
      const hash = await hashPassword('TestPassword');
      expect(hash).toMatch(/^\$2[aby]?\$/);
    });

    it('hash should contain salt rounds indicator', async () => {
      const hash = await hashPassword('TestPassword');
      // Default bcrypt rounds is 12
      expect(hash).toContain('$12$');
    });
  });
});
