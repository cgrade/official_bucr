import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { calculateChanges } from '../audit-logger';

describe('Audit Logger', () => {

  describe('calculateChanges', () => {
    it('should detect changes between objects', () => {
      const oldObj = { name: 'John', age: 30, email: 'john@test.com' };
      const newObj = { name: 'John', age: 31 };

      const changes = calculateChanges(oldObj, newObj);

      expect(changes).toBeDefined();
      expect(changes?.age).toEqual({ from: 30, to: 31 });
      expect(changes?.name).toBeUndefined(); // No change
    });

    it('should return undefined when no changes', () => {
      const oldObj = { name: 'John', age: 30 };
      const newObj = { name: 'John', age: 30 };

      const changes = calculateChanges(oldObj, newObj);

      expect(changes).toBeUndefined();
    });

    it('should track only specified fields', () => {
      const oldObj = { name: 'John', age: 30, email: 'john@test.com' };
      const newObj = { name: 'Jane', age: 31, email: 'jane@test.com' };

      const changes = calculateChanges(oldObj, newObj, ['name']);

      expect(changes).toBeDefined();
      expect(changes?.name).toEqual({ from: 'John', to: 'Jane' });
      expect(changes?.age).toBeUndefined();
      expect(changes?.email).toBeUndefined();
    });

    it('should handle nested object changes', () => {
      const oldObj = { settings: { theme: 'dark' } };
      const newObj = { settings: { theme: 'light' } };

      const changes = calculateChanges(oldObj, newObj);

      expect(changes).toBeDefined();
      expect(changes?.settings).toEqual({
        from: { theme: 'dark' },
        to: { theme: 'light' },
      });
    });

    it('should handle array changes', () => {
      const oldObj = { tags: ['a', 'b'] };
      const newObj = { tags: ['a', 'b', 'c'] };

      const changes = calculateChanges(oldObj, newObj);

      expect(changes).toBeDefined();
      expect(changes?.tags).toEqual({
        from: ['a', 'b'],
        to: ['a', 'b', 'c'],
      });
    });

    it('should handle null and undefined values', () => {
      const oldObj = { value: null as null | string };
      const newObj = { value: 'new' };

      const changes = calculateChanges(oldObj, newObj);

      expect(changes).toBeDefined();
      expect(changes?.value).toEqual({ from: null, to: 'new' });
    });

    it('should handle empty new object', () => {
      const oldObj = { name: 'John', age: 30 };
      const newObj = {};

      const changes = calculateChanges(oldObj, newObj);

      expect(changes).toBeUndefined();
    });

    it('should detect boolean changes', () => {
      const oldObj = { active: true };
      const newObj = { active: false };

      const changes = calculateChanges(oldObj, newObj);

      expect(changes).toBeDefined();
      expect(changes?.active).toEqual({ from: true, to: false });
    });

    it('should detect number to zero changes', () => {
      const oldObj = { count: 10 };
      const newObj = { count: 0 };

      const changes = calculateChanges(oldObj, newObj);

      expect(changes).toBeDefined();
      expect(changes?.count).toEqual({ from: 10, to: 0 });
    });
  });
});
