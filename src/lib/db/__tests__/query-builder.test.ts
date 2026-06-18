import { describe, it, expect } from 'vitest';
import {
  createSelectFields,
  createVendorListSelect,
  createVendorDetailSelect,
  createReservationSelect,
  createOrderSelect,
  createUserProfileSelect,
  buildWhereClause,
  buildOrderBy,
} from '../query-builder';

describe('Query Builder Utilities', () => {
  describe('createSelectFields', () => {
    it('should create select object from field array', () => {
      const fields = ['id', 'name', 'email'];
      const result = createSelectFields(fields);

      expect(result).toEqual({
        id: true,
        name: true,
        email: true,
      });
    });

    it('should handle empty array', () => {
      const result = createSelectFields([]);
      expect(result).toEqual({});
    });
  });

  describe('createVendorListSelect', () => {
    it('should return optimized select for vendor list', () => {
      const select = createVendorListSelect();

      expect(select).toHaveProperty('id');
      expect(select).toHaveProperty('businessName');
      expect(select).toHaveProperty('slug');
      expect(select).toHaveProperty('cuisineTypes');
      expect(select).toHaveProperty('averageRating');
      expect(select).toHaveProperty('totalReviews');
      // Should NOT include heavy relations
      expect(select).not.toHaveProperty('menu');
      expect(select).not.toHaveProperty('reviews');
    });

    it('should include mainBranch with limited fields', () => {
      const select = createVendorListSelect();

      expect(select.branches).toBeDefined();
      expect(select.branches.where).toEqual({ isMainBranch: true });
      expect(select.branches.select).toHaveProperty('id');
      expect(select.branches.select).toHaveProperty('city');
      expect(select.branches.select).toHaveProperty('address');
    });
  });

  describe('createVendorDetailSelect', () => {
    it('should return full select for vendor detail', () => {
      const select = createVendorDetailSelect();

      expect(select).toHaveProperty('id');
      expect(select).toHaveProperty('businessName');
      expect(select).toHaveProperty('description');
      expect(select).toHaveProperty('branches');
      expect(select).toHaveProperty('gallery');
      expect(select).toHaveProperty('menu');
    });

    it('should filter soft-deleted menu items', () => {
      const select = createVendorDetailSelect();

      expect(select.menu.where).toEqual({ deletedAt: null });
    });

    it('should limit reviews count', () => {
      const select = createVendorDetailSelect();

      expect(select.reviews.take).toBeLessThanOrEqual(10);
      expect(select.reviews.orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  describe('createReservationSelect', () => {
    it('should return select with vendor and branch info', () => {
      const select = createReservationSelect();

      expect(select).toHaveProperty('id');
      expect(select).toHaveProperty('date');
      expect(select).toHaveProperty('time');
      expect(select).toHaveProperty('status');
      expect(select).toHaveProperty('vendor');
      expect(select).toHaveProperty('branch');
    });

    it('should include limited vendor fields', () => {
      const select = createReservationSelect();

      expect(select.vendor.select).toHaveProperty('id');
      expect(select.vendor.select).toHaveProperty('businessName');
      expect(select.vendor.select).toHaveProperty('slug');
      // Should not include unnecessary fields
      expect(select.vendor.select).not.toHaveProperty('menu');
    });
  });

  describe('createOrderSelect', () => {
    it('should return select with order items', () => {
      const select = createOrderSelect();

      expect(select).toHaveProperty('id');
      expect(select).toHaveProperty('orderNumber');
      expect(select).toHaveProperty('status');
      expect(select).toHaveProperty('items');
      expect(select).toHaveProperty('vendor');
    });

    it('should include item menu details', () => {
      const select = createOrderSelect();

      expect(select.items.select).toHaveProperty('quantity');
      expect(select.items.select).toHaveProperty('price');
      expect(select.items.select.menuItem).toBeDefined();
    });
  });

  describe('createUserProfileSelect', () => {
    it('should exclude sensitive fields', () => {
      const select = createUserProfileSelect();

      expect(select).toHaveProperty('id');
      expect(select).toHaveProperty('email');
      expect(select).toHaveProperty('name');
      expect(select.passwordHash).toBe(false);
    });

    it('should include credits balance', () => {
      const select = createUserProfileSelect();

      expect(select).toHaveProperty('creditsBalance');
    });
  });

  describe('buildWhereClause', () => {
    it('should build where clause with soft delete filter', () => {
      const where = buildWhereClause({}, { softDelete: true });

      expect(where.deletedAt).toBeNull();
    });

    it('should merge custom filters', () => {
      const where = buildWhereClause(
        { status: 'active', city: 'Lagos' },
        { softDelete: true }
      );

      expect(where).toEqual({
        status: 'active',
        city: 'Lagos',
        deletedAt: null,
      });
    });

    it('should handle search across multiple fields', () => {
      const where = buildWhereClause(
        {},
        { 
          search: 'test', 
          searchFields: ['name', 'email'] 
        }
      );

      expect(where.OR).toEqual([
        { name: { contains: 'test', mode: 'insensitive' } },
        { email: { contains: 'test', mode: 'insensitive' } },
      ]);
    });
  });

  describe('buildOrderBy', () => {
    it('should build orderBy from sort params', () => {
      const orderBy = buildOrderBy('createdAt', 'desc');

      expect(orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should use default if no params provided', () => {
      const orderBy = buildOrderBy(undefined, undefined);

      expect(orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should handle nested field sorting', () => {
      const orderBy = buildOrderBy('vendor.name', 'asc');

      expect(orderBy).toEqual({ vendor: { name: 'asc' } });
    });
  });
});
