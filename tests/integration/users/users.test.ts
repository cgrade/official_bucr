import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestUser,
  createTestVendor,
  cleanupTestData,
  createMockRequest,
  parseResponse,
  generateTestTokens,
  prisma,
} from '../../utils/test-helpers';
import { GET as getProfile, PATCH as updateProfile } from '@/app/api/users/profile/route';
import { GET as getCredits } from '@/app/api/users/credits/route';
import { POST as purchaseCredits } from '@/app/api/users/credits/purchase/route';
import { GET as getFavorites, POST as addFavorite, DELETE as removeFavorite } from '@/app/api/users/favorites/route';
import { GET as getReservations } from '@/app/api/users/reservations/route';
import { GET as getOrders } from '@/app/api/users/orders/route';

describe('Users API Integration Tests', () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let userTokens: { accessToken: string; refreshToken: string };

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    testUser = await createTestUser({
      email: `apiuser-${Date.now()}@test.com`,
      phone: `+234812${Date.now().toString().slice(-7)}`,
    });
    userTokens = await generateTestTokens(testUser.id, 'user', testUser.email);
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile', async () => {
      const request = createMockRequest('GET', '/api/users/profile', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
      });

      const response = await getProfile(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.email).toBe(testUser.email);
      expect(data.data.name).toBe(testUser.name);
      expect(data.data.creditsBalance).toBeDefined();
    });

    it('should not include password hash', async () => {
      const request = createMockRequest('GET', '/api/users/profile', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
      });

      const response = await getProfile(request);
      const data = await parseResponse(response);

      expect(data.data.passwordHash).toBeUndefined();
    });

    it('should reject unauthenticated request', async () => {
      const request = createMockRequest('GET', '/api/users/profile');

      const response = await getProfile(request);
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/users/profile', () => {
    it('should update user profile', async () => {
      const request = createMockRequest('PATCH', '/api/users/profile', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        body: {
          name: 'Updated Name',
          seatingPreferences: 'window',
        },
      });

      const response = await updateProfile(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.name).toBe('Updated Name');
      expect(data.data.seatingPreferences).toBe('window');
    });

    it('should update dietary restrictions', async () => {
      const request = createMockRequest('PATCH', '/api/users/profile', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        body: {
          dietaryRestrictions: ['vegetarian', 'gluten-free'],
        },
      });

      const response = await updateProfile(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.dietaryRestrictions).toContain('vegetarian');
      expect(data.data.dietaryRestrictions).toContain('gluten-free');
    });

    it('should reject duplicate phone number', async () => {
      const otherUser = await createTestUser({
        email: `other-${Date.now()}@test.com`,
        phone: '+2348199999999',
      });

      const request = createMockRequest('PATCH', '/api/users/profile', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        body: {
          phone: otherUser.phone,
        },
      });

      const response = await updateProfile(request);
      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/users/credits', () => {
    it('should return credit balance and history', async () => {
      const request = createMockRequest('GET', '/api/users/credits', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
      });

      const response = await getCredits(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.balance).toBeDefined();
      expect(data.data.balanceValue).toBeDefined();
      expect(data.data.transactions).toBeDefined();
    });

    it('should include expiring credits info', async () => {
      const request = createMockRequest('GET', '/api/users/credits', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
      });

      const response = await getCredits(request);
      const data = await parseResponse(response);

      expect(data.data.expiringIn30Days).toBeDefined();
    });
  });

  describe('POST /api/users/credits/purchase', () => {
    it('should purchase credits', async () => {
      const initialBalance = testUser.creditsBalance;

      const request = createMockRequest('POST', '/api/users/credits/purchase', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        body: {
          credits: 50,
          paystackReference: `test_ref_${Date.now()}`,
        },
      });

      const response = await purchaseCredits(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.newBalance).toBe(initialBalance + 50);
    });

    it('should reject invalid credits amount', async () => {
      const request = createMockRequest('POST', '/api/users/credits/purchase', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        body: {
          credits: -10,
          paystackReference: `test_ref_${Date.now()}`,
        },
      });

      const response = await purchaseCredits(request);
      expect(response.status).toBe(422);
    });
  });

  describe('Favorites API', () => {
    let testVendorData: Awaited<ReturnType<typeof createTestVendor>>;

    beforeEach(async () => {
      testVendorData = await createTestVendor({
        slug: `fav-vendor-${Date.now()}`,
      });
    });

    describe('GET /api/users/favorites', () => {
      it('should return empty array when no favorites', async () => {
        const request = createMockRequest('GET', '/api/users/favorites', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        });

        const response = await getFavorites(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(Array.isArray(data.data)).toBe(true);
      });
    });

    describe('POST /api/users/favorites', () => {
      it('should add vendor to favorites', async () => {
        const request = createMockRequest('POST', '/api/users/favorites', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: { vendorId: testVendorData.vendor.id },
        });

        const response = await addFavorite(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(201);
        expect(data.data.vendorId).toBe(testVendorData.vendor.id);
      });

      it('should reject duplicate favorite', async () => {
        // Add first
        await prisma.favorite.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
          },
        });

        // Try to add again
        const request = createMockRequest('POST', '/api/users/favorites', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: { vendorId: testVendorData.vendor.id },
        });

        const response = await addFavorite(request);
        expect(response.status).toBe(409);
      });
    });

    describe('DELETE /api/users/favorites', () => {
      it('should remove vendor from favorites', async () => {
        // Add favorite first
        await prisma.favorite.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
          },
        });

        const request = createMockRequest('DELETE', '/api/users/favorites', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          searchParams: { vendorId: testVendorData.vendor.id },
        });

        const response = await removeFavorite(request);
        expect(response.status).toBe(200);

        // Verify removed
        const favorite = await prisma.favorite.findUnique({
          where: {
            userId_vendorId: {
              userId: testUser.id,
              vendorId: testVendorData.vendor.id,
            },
          },
        });
        expect(favorite).toBeNull();
      });
    });
  });

  describe('GET /api/users/reservations', () => {
    it('should return user reservations', async () => {
      const request = createMockRequest('GET', '/api/users/reservations', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
      });

      const response = await getReservations(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const request = createMockRequest('GET', '/api/users/reservations', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        searchParams: { page: '1', limit: '5' },
      });

      const response = await getReservations(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.meta).toBeDefined();
      expect(data.meta.page).toBe(1);
      expect(data.meta.limit).toBe(5);
    });
  });

  describe('GET /api/users/orders', () => {
    it('should return user orders', async () => {
      const request = createMockRequest('GET', '/api/users/orders', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
      });

      const response = await getOrders(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should filter by order type', async () => {
      const request = createMockRequest('GET', '/api/users/orders', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        searchParams: { orderType: 'delivery' },
      });

      const response = await getOrders(request);
      expect(response.status).toBe(200);
    });
  });
});
