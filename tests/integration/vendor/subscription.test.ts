import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { createMockRequest, parseResponse } from '../../utils/test-helpers';
import { config } from '@/lib/config';

describe('Vendor Subscription API Integration Tests', () => {
  let testUser: { id: string; email: string };
  let testVendor: { id: string };
  let vendorTokens: { accessToken: string; refreshToken: string };

  beforeAll(async () => {
    const passwordHash = await hashPassword('VendorPass123!');
    testUser = await db.user.create({
      data: {
        email: `vendor-sub-test-${Date.now()}@test.com`,
        passwordHash,
        name: 'Vendor Sub Test User',
        phone: `+234805${Date.now().toString().slice(-7)}`,
      },
    });

    testVendor = await db.vendor.create({
      data: {
        ownerId: testUser.id,
        businessName: `Sub API Test Vendor ${Date.now()}`,
        slug: `sub-api-test-vendor-${Date.now()}`,
        email: `sub-api-vendor-${Date.now()}@test.com`,
        phone: `+234806${Date.now().toString().slice(-7)}`,
        subscriptionTier: 'basic',
        verificationStatus: 'approved',
      },
    });

    // Create a branch for the vendor
    await db.vendorBranch.create({
      data: {
        vendorId: testVendor.id,
        name: 'Main Branch',
        address: '123 Test Street',
        city: 'Lagos',
        state: 'Lagos',
        isMainBranch: true,
      },
    });

    vendorTokens = {
      accessToken: await signAccessToken({
        sub: testUser.id,
        email: testUser.email,
        role: 'vendor',
      }),
      refreshToken: await signRefreshToken({
        sub: testUser.id,
        email: testUser.email,
        role: 'vendor',
      }),
    };
  });

  afterAll(async () => {
    await db.vendorSubscription.deleteMany({ where: { vendorId: testVendor.id } });
    await db.payment.deleteMany({ where: { vendorId: testVendor.id } });
    await db.vendorBranch.deleteMany({ where: { vendorId: testVendor.id } });
    await db.vendor.delete({ where: { id: testVendor.id } });
    await db.user.delete({ where: { id: testUser.id } });
  });

  describe('GET /api/vendor/subscription', () => {
    it('should return subscription details and tiers', async () => {
      const { GET } = await import('@/app/api/vendor/subscription/route');

      const request = createMockRequest('GET', '/api/vendor/subscription', {
        headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
      });

      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.subscription).toBeDefined();
      expect(data.data.tiers).toBeDefined();
      expect(data.data.tiers.basic).toBeDefined();
      expect(data.data.tiers.pro).toBeDefined();
      expect(data.data.tiers.elite).toBeDefined(); // tiers are basic/pro/elite (renamed from premium)
    });

    it('should include subscription history when requested', async () => {
      const { GET } = await import('@/app/api/vendor/subscription/route');

      const request = createMockRequest('GET', '/api/vendor/subscription?includeHistory=true', {
        headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
      });

      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.history).toBeDefined();
    });

    it('should reject unauthenticated request', async () => {
      const { GET } = await import('@/app/api/vendor/subscription/route');

      const request = createMockRequest('GET', '/api/vendor/subscription', {});

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should reject non-vendor user', async () => {
      const { GET } = await import('@/app/api/vendor/subscription/route');

      const userAccessToken = await signAccessToken({
        sub: testUser.id,
        email: testUser.email,
        role: 'user',
      });

      const request = createMockRequest('GET', '/api/vendor/subscription', {
        headers: { Authorization: `Bearer ${userAccessToken}` },
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/vendor/subscription', () => {
    afterEach(async () => {
      // Clean up payments and subscriptions
      await db.payment.deleteMany({ where: { vendorId: testVendor.id } });
      await db.vendorSubscription.deleteMany({ where: { vendorId: testVendor.id } });
      await db.vendor.update({
        where: { id: testVendor.id },
        data: { subscriptionTier: 'basic', subscriptionExpiresAt: null },
      });
    });

    it('should reject invalid tier', async () => {
      const { POST } = await import('@/app/api/vendor/subscription/route');

      const request = createMockRequest('POST', '/api/vendor/subscription', {
        headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
        body: {
          tier: 'invalid_tier',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(422);
    });

    it('should reject unauthenticated request', async () => {
      const { POST } = await import('@/app/api/vendor/subscription/route');

      const request = createMockRequest('POST', '/api/vendor/subscription', {
        body: {
          tier: 'pro',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/vendor/subscription', () => {
    beforeEach(async () => {
      // Create an active subscription
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await db.vendorSubscription.create({
        data: {
          vendorId: testVendor.id,
          tier: 'pro',
          status: 'active',
          amountPaidKobo: config.subscriptions.pro.priceNgn * 100,
          startsAt: now,
          expiresAt,
          autoRenew: false,
        },
      });

      await db.vendor.update({
        where: { id: testVendor.id },
        data: { subscriptionTier: 'pro', subscriptionExpiresAt: expiresAt },
      });
    });

    afterEach(async () => {
      await db.vendorSubscription.deleteMany({ where: { vendorId: testVendor.id } });
      await db.vendor.update({
        where: { id: testVendor.id },
        data: { subscriptionTier: 'basic', subscriptionExpiresAt: null },
      });
    });

    it('should enable auto-renew', async () => {
      const { PATCH } = await import('@/app/api/vendor/subscription/route');

      const request = createMockRequest('PATCH', '/api/vendor/subscription', {
        headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
        body: { autoRenew: true },
      });

      const response = await PATCH(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.autoRenew).toBe(true);
    });

    it('should disable auto-renew', async () => {
      const { PATCH } = await import('@/app/api/vendor/subscription/route');

      // First enable
      const enableRequest = createMockRequest('PATCH', '/api/vendor/subscription', {
        headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
        body: { autoRenew: true },
      });
      await PATCH(enableRequest);

      // Then disable
      const disableRequest = createMockRequest('PATCH', '/api/vendor/subscription', {
        headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
        body: { autoRenew: false },
      });

      const response = await PATCH(disableRequest);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.autoRenew).toBe(false);
    });

    it('should reject invalid autoRenew value', async () => {
      const { PATCH } = await import('@/app/api/vendor/subscription/route');

      const request = createMockRequest('PATCH', '/api/vendor/subscription', {
        headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
        body: { autoRenew: 'yes' },
      });

      const response = await PATCH(request);
      expect(response.status).toBe(422);
    });
  });

  describe('DELETE /api/vendor/subscription', () => {
    beforeEach(async () => {
      // Create an active subscription
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await db.vendorSubscription.create({
        data: {
          vendorId: testVendor.id,
          tier: 'pro',
          status: 'active',
          amountPaidKobo: config.subscriptions.pro.priceNgn * 100,
          startsAt: now,
          expiresAt,
        },
      });

      await db.vendor.update({
        where: { id: testVendor.id },
        data: { subscriptionTier: 'pro', subscriptionExpiresAt: expiresAt },
      });
    });

    afterEach(async () => {
      await db.vendorSubscription.deleteMany({ where: { vendorId: testVendor.id } });
      await db.vendor.update({
        where: { id: testVendor.id },
        data: { subscriptionTier: 'basic', subscriptionExpiresAt: null },
      });
    });

    it('should cancel subscription', async () => {
      const { DELETE } = await import('@/app/api/vendor/subscription/route');

      const request = createMockRequest('DELETE', '/api/vendor/subscription', {
        headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
      });

      const response = await DELETE(request);

      expect(response.status).toBe(200);

      const subscription = await db.vendorSubscription.findFirst({
        where: { vendorId: testVendor.id },
        orderBy: { createdAt: 'desc' },
      });

      expect(subscription?.status).toBe('cancelled');
    });

    it('should reject unauthenticated request', async () => {
      const { DELETE } = await import('@/app/api/vendor/subscription/route');

      const request = createMockRequest('DELETE', '/api/vendor/subscription', {});

      const response = await DELETE(request);
      expect(response.status).toBe(401);
    });
  });
});
