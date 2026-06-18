import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestVendor,
  cleanupTestData,
  createMockRequest,
  parseResponse,
  generateTestTokens,
  prisma,
} from '../../utils/test-helpers';
import { GET as getVendors } from '@/app/api/vendors/route';
import { GET as getVendorBySlug } from '@/app/api/vendors/[slug]/route';
import { GET as getVendorProfile, PATCH as updateVendorProfile } from '@/app/api/vendor/profile/route';
import { GET as getBranches, POST as createBranch } from '@/app/api/vendor/branches/route';
import { GET as getMenu, POST as createMenuItem } from '@/app/api/vendor/menu/route';
import { GET as getGallery, POST as addGalleryImage } from '@/app/api/vendor/gallery/route';

describe('Vendors API Integration Tests', () => {
  let testVendorData: Awaited<ReturnType<typeof createTestVendor>>;
  let vendorTokens: { accessToken: string; refreshToken: string };

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    testVendorData = await createTestVendor({
      slug: `vendor-${Date.now()}`,
    });
    vendorTokens = await generateTestTokens(
      testVendorData.owner.id,
      'vendor',
      testVendorData.owner.email
    );
  });

  describe('Public Vendor Endpoints', () => {
    describe('GET /api/vendors', () => {
      it('should return list of vendors', async () => {
        const request = createMockRequest('GET', '/api/vendors');

        const response = await getVendors(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(Array.isArray(data.data)).toBe(true);
      });

      it('should support search by name', async () => {
        const request = createMockRequest('GET', '/api/vendors', {
          searchParams: { search: 'Test' },
        });

        const response = await getVendors(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
      });

      it('should support filtering by city', async () => {
        const request = createMockRequest('GET', '/api/vendors', {
          searchParams: { city: 'Lagos' },
        });

        const response = await getVendors(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
      });

      it('should support filtering by cuisine', async () => {
        const request = createMockRequest('GET', '/api/vendors', {
          searchParams: { cuisine: 'Nigerian' },
        });

        const response = await getVendors(request);
        expect(response.status).toBe(200);
      });

      it('should support pagination', async () => {
        const request = createMockRequest('GET', '/api/vendors', {
          searchParams: { page: '1', limit: '10' },
        });

        const response = await getVendors(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.meta).toBeDefined();
        expect(data.meta.page).toBe(1);
      });
    });

    describe('GET /api/vendors/[slug]', () => {
      it('should return vendor details by slug', async () => {
        const request = createMockRequest(
          'GET',
          `/api/vendors/${testVendorData.vendor.slug}`
        );

        const response = await getVendorBySlug(request, {
          params: { slug: testVendorData.vendor.slug },
        });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.businessName).toBe(testVendorData.vendor.businessName);
      });

      it('should include branches in response', async () => {
        const request = createMockRequest(
          'GET',
          `/api/vendors/${testVendorData.vendor.slug}`
        );

        const response = await getVendorBySlug(request, {
          params: { slug: testVendorData.vendor.slug },
        });
        const data = await parseResponse(response);

        expect(data.data.branches).toBeDefined();
        expect(data.data.branches.length).toBeGreaterThan(0);
      });

      it('should return 404 for non-existent vendor', async () => {
        const request = createMockRequest('GET', '/api/vendors/non-existent-slug');

        const response = await getVendorBySlug(request, {
          params: { slug: 'non-existent-slug' },
        });

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Vendor Portal Endpoints', () => {
    describe('GET /api/vendor/profile', () => {
      it('should return vendor profile for owner', async () => {
        const request = createMockRequest('GET', '/api/vendor/profile', {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
        });

        const response = await getVendorProfile(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.id).toBe(testVendorData.vendor.id);
      });

      it('should reject non-vendor users', async () => {
        const request = createMockRequest('GET', '/api/vendor/profile');

        const response = await getVendorProfile(request);
        expect(response.status).toBe(401);
      });
    });

    describe('PATCH /api/vendor/profile', () => {
      it('should update vendor profile', async () => {
        const request = createMockRequest('PATCH', '/api/vendor/profile', {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          body: {
            description: 'Updated description',
            website: 'https://updated.com',
          },
        });

        const response = await updateVendorProfile(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.description).toBe('Updated description');
        expect(data.data.website).toBe('https://updated.com');
      });

      it('should update delivery settings', async () => {
        const request = createMockRequest('PATCH', '/api/vendor/profile', {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          body: {
            deliveryEnabled: true,
            deliveryFeeType: 'flat',
            deliveryFlatFee: 150000,
            minDeliveryOrder: 500000,
          },
        });

        const response = await updateVendorProfile(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.deliveryEnabled).toBe(true);
        expect(data.data.deliveryFlatFee).toBe(150000);
      });
    });

    describe('Branches CRUD', () => {
      describe('GET /api/vendor/branches', () => {
        it('should return vendor branches', async () => {
          const request = createMockRequest('GET', '/api/vendor/branches', {
            headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          });

          const response = await getBranches(request);
          const data = await parseResponse(response);

          expect(response.status).toBe(200);
          expect(Array.isArray(data.data)).toBe(true);
          expect(data.data.length).toBeGreaterThan(0);
        });
      });

      describe('POST /api/vendor/branches', () => {
        it('should create new branch', async () => {
          const request = createMockRequest('POST', '/api/vendor/branches', {
            headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
            body: {
              name: 'New Branch',
              address: '789 New Street',
              city: 'Abuja',
              state: 'FCT',
              phone: '+2348199999999',
              operatingHours: [
                { dayOfWeek: 1, openTime: '09:00', closeTime: '21:00', isClosed: false },
              ],
            },
          });

          const response = await createBranch(request);
          const data = await parseResponse(response);

          expect(response.status).toBe(201);
          expect(data.data.name).toBe('New Branch');
          expect(data.data.city).toBe('Abuja');
        });
      });
    });

    describe('Menu CRUD', () => {
      describe('GET /api/vendor/menu', () => {
        it('should return menu categories and items', async () => {
          const request = createMockRequest('GET', '/api/vendor/menu', {
            headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          });

          const response = await getMenu(request);
          const data = await parseResponse(response);

          expect(response.status).toBe(200);
          expect(data.data.categories).toBeDefined();
        });
      });

      describe('POST /api/vendor/menu', () => {
        it('should create menu category', async () => {
          const request = createMockRequest('POST', '/api/vendor/menu', {
            headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
            body: {
              type: 'category',
              name: 'Main Courses',
              description: 'Our signature dishes',
              sortOrder: 1,
            },
          });

          const response = await createMenuItem(request);
          const data = await parseResponse(response);

          expect(response.status).toBe(201);
          expect(data.data.name).toBe('Main Courses');
        });

        it('should create menu item', async () => {
          // First create a category
          const category = await prisma.menuCategory.create({
            data: {
              vendorId: testVendorData.vendor.id,
              name: 'Test Category',
              sortOrder: 1,
            },
          });

          const request = createMockRequest('POST', '/api/vendor/menu', {
            headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
            body: {
              type: 'item',
              categoryId: category.id,
              name: 'Jollof Rice',
              description: 'Delicious Nigerian rice',
              price: 350000,
              sortOrder: 1,
            },
          });

          const response = await createMenuItem(request);
          const data = await parseResponse(response);

          expect(response.status).toBe(201);
          expect(data.data.name).toBe('Jollof Rice');
          expect(data.data.price).toBe(350000);
        });
      });
    });

    describe('Gallery CRUD', () => {
      describe('GET /api/vendor/gallery', () => {
        it('should return gallery images', async () => {
          const request = createMockRequest('GET', '/api/vendor/gallery', {
            headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          });

          const response = await getGallery(request);
          const data = await parseResponse(response);

          expect(response.status).toBe(200);
          expect(Array.isArray(data.data)).toBe(true);
        });
      });

      describe('POST /api/vendor/gallery', () => {
        it('should add gallery image', async () => {
          const request = createMockRequest('POST', '/api/vendor/gallery', {
            headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
            body: {
              url: 'https://example.com/image.jpg',
              caption: 'Beautiful interior',
              category: 'venue',
              sortOrder: 1,
            },
          });

          const response = await addGalleryImage(request);
          const data = await parseResponse(response);

          expect(response.status).toBe(201);
          expect(data.data.caption).toBe('Beautiful interior');
        });
      });
    });
  });
});
