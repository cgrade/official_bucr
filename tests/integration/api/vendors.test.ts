import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('Vendors API Integration Tests', () => {
  describe('GET /api/vendors', () => {
    it('should return paginated vendor list', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.items).toBeInstanceOf(Array);
      expect(data.data.pagination).toBeDefined();
      expect(data.data.pagination.page).toBe(1);
      expect(data.data.pagination.limit).toBeDefined();
      expect(data.data.pagination.total).toBeDefined();
      expect(data.data.pagination.totalPages).toBeDefined();
    });

    it('should support pagination parameters', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors?page=1&limit=5`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination.page).toBe(1);
      expect(data.data.pagination.limit).toBe(5);
      expect(data.data.items.length).toBeLessThanOrEqual(5);
    });

    it('should filter by search query', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors?search=grill`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Results should contain search term in name or description
      if (data.data.items.length > 0) {
        const hasMatch = data.data.items.some((v: any) =>
          v.businessName.toLowerCase().includes('grill') ||
          v.description?.toLowerCase().includes('grill')
        );
        expect(hasMatch).toBe(true);
      }
    });

    it('should filter by cuisine type', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors?cuisine=Nigerian`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // All results should have the cuisine type
      data.data.items.forEach((v: any) => {
        expect(v.cuisineTypes).toContain('Nigerian');
      });
    });

    it('should filter by minimum rating', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors?minRating=4`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // All results should meet minimum rating
      data.data.items.forEach((v: any) => {
        expect(v.averageRating).toBeGreaterThanOrEqual(4);
      });
    });

    it('should filter by featured status', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors?featured=true`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // All results should be featured
      data.data.items.forEach((v: any) => {
        expect(v.isFeatured).toBe(true);
      });
    });

    it('should validate pagination params', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors?page=0`);
      const data = await response.json();

      // Should either return error or use defaults
      expect([200, 422]).toContain(response.status);
    });

    it('should include security headers', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors`);

      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
    });

    it('should return vendor with required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors?limit=1`);
      const data = await response.json();

      if (data.data.items.length > 0) {
        const vendor = data.data.items[0];
        expect(vendor).toHaveProperty('id');
        expect(vendor).toHaveProperty('businessName');
        expect(vendor).toHaveProperty('slug');
        expect(vendor).toHaveProperty('cuisineTypes');
        expect(vendor).toHaveProperty('averageRating');
        expect(vendor).toHaveProperty('totalReviews');
      }
    });
  });

  describe('GET /api/vendors/[slug]', () => {
    let vendorSlug: string;

    it('should get vendor list first to get a slug', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors?limit=1`);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.data.items.length > 0) {
        vendorSlug = data.data.items[0].slug;
      }
    });

    it('should return vendor detail by slug', async () => {
      if (!vendorSlug) return; // Skip if no vendors

      const response = await fetch(`${BASE_URL}/api/vendors/${vendorSlug}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.slug).toBe(vendorSlug);
    });

    it('should include branches in detail', async () => {
      if (!vendorSlug) return;

      const response = await fetch(`${BASE_URL}/api/vendors/${vendorSlug}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.branches).toBeInstanceOf(Array);
    });

    it('should include menu in detail', async () => {
      if (!vendorSlug) return;

      const response = await fetch(`${BASE_URL}/api/vendors/${vendorSlug}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.menu).toBeInstanceOf(Array);
    });

    it('should include gallery in detail', async () => {
      if (!vendorSlug) return;

      const response = await fetch(`${BASE_URL}/api/vendors/${vendorSlug}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.gallery).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent vendor', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors/non-existent-slug-12345`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/experiences', () => {
    it('should return experiences list', async () => {
      const response = await fetch(`${BASE_URL}/api/experiences`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
    });

    it('should include experience details', async () => {
      const response = await fetch(`${BASE_URL}/api/experiences`);
      const data = await response.json();

      if (data.data.length > 0) {
        const experience = data.data[0];
        expect(experience).toHaveProperty('id');
        expect(experience).toHaveProperty('title');
        expect(experience).toHaveProperty('creditsRequired');
      }
    });
  });

  describe('Response Format Consistency', () => {
    it('should have consistent success response format', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors`);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(typeof data.success).toBe('boolean');
    });

    it('should have consistent error response format', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors/non-existent`);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
    });

    it('should have consistent pagination format', async () => {
      const response = await fetch(`${BASE_URL}/api/vendors`);
      const data = await response.json();

      const pagination = data.data.pagination;
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('totalPages');
      expect(pagination).toHaveProperty('hasNext');
      expect(pagination).toHaveProperty('hasPrev');
    });
  });
});
