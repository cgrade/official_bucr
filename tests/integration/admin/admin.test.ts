import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestUser,
  createTestVendor,
  createTestAdmin,
  cleanupTestData,
  createMockRequest,
  parseResponse,
  generateTestTokens,
  prisma,
} from '../../utils/test-helpers';
import { GET as getDashboard } from '@/app/api/admin/dashboard/route';
import { GET as getUsers } from '@/app/api/admin/users/route';
import { GET as getUser, PATCH as updateUser } from '@/app/api/admin/users/[id]/route';
import { GET as getVendors } from '@/app/api/admin/vendors/route';
import { GET as getVendor, PATCH as updateVendor, DELETE as deleteVendor } from '@/app/api/admin/vendors/[id]/route';
import { GET as getDocuments } from '@/app/api/admin/documents/route';
import { POST as verifyDocument } from '@/app/api/admin/documents/[id]/verify/route';
import { GET as getAnalytics } from '@/app/api/admin/analytics/route';

describe('Admin API Integration Tests', () => {
  let testAdmin: Awaited<ReturnType<typeof createTestAdmin>>;
  let adminTokens: { accessToken: string; refreshToken: string };
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let testVendorData: Awaited<ReturnType<typeof createTestVendor>>;

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Create admin
    testAdmin = await createTestAdmin();
    adminTokens = await generateTestTokens(testAdmin.id, 'admin', testAdmin.email);

    // Create test user
    testUser = await createTestUser({
      email: `admintest-user-${Date.now()}@test.com`,
      phone: `+234817${Date.now().toString().slice(-7)}`,
    });

    // Create test vendor
    testVendorData = await createTestVendor({
      slug: `admin-test-vendor-${Date.now()}`,
    });
  });

  describe('Authorization', () => {
    it('should reject non-admin users', async () => {
      const userTokens = await generateTestTokens(testUser.id, 'user', testUser.email);

      const request = createMockRequest('GET', '/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${userTokens.accessToken}` },
      });

      const response = await getDashboard(request);
      expect(response.status).toBe(401);
    });

    it('should reject unauthenticated requests', async () => {
      const request = createMockRequest('GET', '/api/admin/dashboard');

      const response = await getDashboard(request);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/dashboard', () => {
    it('should return dashboard statistics', async () => {
      const request = createMockRequest('GET', '/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
      });

      const response = await getDashboard(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.overview).toBeDefined();
      expect(data.data.overview.totalUsers).toBeDefined();
      expect(data.data.overview.totalVendors).toBeDefined();
      expect(data.data.today).toBeDefined();
      expect(data.data.thisMonth).toBeDefined();
      expect(data.data.credits).toBeDefined();
    });

    it('should include recent users and vendors', async () => {
      const request = createMockRequest('GET', '/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
      });

      const response = await getDashboard(request);
      const data = await parseResponse(response);

      expect(data.data.recent).toBeDefined();
      expect(data.data.recent.users).toBeDefined();
      expect(data.data.recent.vendors).toBeDefined();
    });
  });

  describe('Users Management', () => {
    describe('GET /api/admin/users', () => {
      it('should return list of users', async () => {
        const request = createMockRequest('GET', '/api/admin/users', {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
        });

        const response = await getUsers(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.meta).toBeDefined();
      });

      it('should support search', async () => {
        const request = createMockRequest('GET', '/api/admin/users', {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          searchParams: { search: testUser.email.split('@')[0] },
        });

        const response = await getUsers(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
      });

      it('should support pagination', async () => {
        const request = createMockRequest('GET', '/api/admin/users', {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          searchParams: { page: '1', limit: '5' },
        });

        const response = await getUsers(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.meta.page).toBe(1);
        expect(data.meta.limit).toBe(5);
      });
    });

    describe('GET /api/admin/users/[id]', () => {
      it('should return user details with history', async () => {
        const request = createMockRequest('GET', `/api/admin/users/${testUser.id}`, {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
        });

        const response = await getUser(request, { params: { id: testUser.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.id).toBe(testUser.id);
        expect(data.data.email).toBe(testUser.email);
      });

      it('should return 404 for non-existent user', async () => {
        const request = createMockRequest('GET', '/api/admin/users/non-existent-id', {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
        });

        const response = await getUser(request, { params: { id: 'non-existent-id' } });
        expect(response.status).toBe(404);
      });
    });

    describe('PATCH /api/admin/users/[id]', () => {
      it('should adjust user credits', async () => {
        const initialBalance = testUser.creditsBalance;

        const request = createMockRequest('PATCH', `/api/admin/users/${testUser.id}`, {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          body: {
            adjustCredits: {
              amount: 50,
              reason: 'Customer support credit',
            },
          },
        });

        const response = await updateUser(request, { params: { id: testUser.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.newBalance).toBe(initialBalance + 50);
      });

      it('should ban user', async () => {
        const request = createMockRequest('PATCH', `/api/admin/users/${testUser.id}`, {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          body: { banned: true },
        });

        const response = await updateUser(request, { params: { id: testUser.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.deletedAt).toBeDefined();
      });

      it('should unban user', async () => {
        // Ban first
        await prisma.user.update({
          where: { id: testUser.id },
          data: { deletedAt: new Date() },
        });

        const request = createMockRequest('PATCH', `/api/admin/users/${testUser.id}`, {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          body: { banned: false },
        });

        const response = await updateUser(request, { params: { id: testUser.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.deletedAt).toBeNull();
      });

      it('should not allow negative balance', async () => {
        const request = createMockRequest('PATCH', `/api/admin/users/${testUser.id}`, {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          body: {
            adjustCredits: {
              amount: -99999,
              reason: 'Invalid adjustment',
            },
          },
        });

        const response = await updateUser(request, { params: { id: testUser.id } });
        expect(response.status).toBe(400);
      });
    });
  });

  describe('Vendors Management', () => {
    describe('GET /api/admin/vendors', () => {
      it('should return list of vendors', async () => {
        const request = createMockRequest('GET', '/api/admin/vendors', {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
        });

        const response = await getVendors(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(Array.isArray(data.data)).toBe(true);
      });

      it('should filter by verification status', async () => {
        const request = createMockRequest('GET', '/api/admin/vendors', {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          searchParams: { status: 'approved' },
        });

        const response = await getVendors(request);
        expect(response.status).toBe(200);
      });

      it('should filter by subscription tier', async () => {
        const request = createMockRequest('GET', '/api/admin/vendors', {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          searchParams: { tier: 'pro' },
        });

        const response = await getVendors(request);
        expect(response.status).toBe(200);
      });
    });

    describe('GET /api/admin/vendors/[id]', () => {
      it('should return vendor details', async () => {
        const request = createMockRequest('GET', `/api/admin/vendors/${testVendorData.vendor.id}`, {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
        });

        const response = await getVendor(request, { params: { id: testVendorData.vendor.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.id).toBe(testVendorData.vendor.id);
        expect(data.data.branches).toBeDefined();
      });
    });

    describe('PATCH /api/admin/vendors/[id]', () => {
      it('should update verification status', async () => {
        const request = createMockRequest('PATCH', `/api/admin/vendors/${testVendorData.vendor.id}`, {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          body: { verificationStatus: 'approved' },
        });

        const response = await updateVendor(request, { params: { id: testVendorData.vendor.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.verificationStatus).toBe('approved');
      });

      it('should update subscription tier', async () => {
        const request = createMockRequest('PATCH', `/api/admin/vendors/${testVendorData.vendor.id}`, {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          body: { subscriptionTier: 'premium' },
        });

        const response = await updateVendor(request, { params: { id: testVendorData.vendor.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.subscriptionTier).toBe('premium');
      });
    });

    describe('DELETE /api/admin/vendors/[id]', () => {
      it('should soft delete vendor', async () => {
        const request = createMockRequest('DELETE', `/api/admin/vendors/${testVendorData.vendor.id}`, {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
        });

        const response = await deleteVendor(request, { params: { id: testVendorData.vendor.id } });

        expect(response.status).toBe(200);

        const vendor = await prisma.vendor.findUnique({
          where: { id: testVendorData.vendor.id },
        });
        expect(vendor?.deletedAt).toBeDefined();
      });
    });
  });

  describe('Documents Verification', () => {
    describe('GET /api/admin/documents', () => {
      it('should return pending documents by default', async () => {
        // Create pending document
        await prisma.vendorDocument.create({
          data: {
            vendorId: testVendorData.vendor.id,
            type: 'cac',
            fileUrl: 'https://example.com/doc.pdf',
            fileName: 'cac.pdf',
            status: 'pending',
            isRequired: true,
          },
        });

        const request = createMockRequest('GET', '/api/admin/documents', {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
        });

        const response = await getDocuments(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(Array.isArray(data.data)).toBe(true);
      });

      it('should filter by status', async () => {
        const request = createMockRequest('GET', '/api/admin/documents', {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          searchParams: { status: 'approved' },
        });

        const response = await getDocuments(request);
        expect(response.status).toBe(200);
      });
    });

    describe('POST /api/admin/documents/[id]/verify', () => {
      it('should approve document', async () => {
        const doc = await prisma.vendorDocument.create({
          data: {
            vendorId: testVendorData.vendor.id,
            type: 'cac',
            fileUrl: 'https://example.com/doc.pdf',
            fileName: 'cac.pdf',
            status: 'pending',
            isRequired: true,
          },
        });

        const request = createMockRequest('POST', `/api/admin/documents/${doc.id}/verify`, {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          body: { status: 'approved' },
        });

        const response = await verifyDocument(request, { params: { id: doc.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.document.status).toBe('approved');
        expect(data.data.document.reviewedById).toBe(testAdmin.id);
      });

      it('should reject document with reason', async () => {
        const doc = await prisma.vendorDocument.create({
          data: {
            vendorId: testVendorData.vendor.id,
            type: 'tin',
            fileUrl: 'https://example.com/tin.pdf',
            fileName: 'tin.pdf',
            status: 'pending',
            isRequired: true,
          },
        });

        const request = createMockRequest('POST', `/api/admin/documents/${doc.id}/verify`, {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          body: {
            status: 'rejected',
            rejectionReason: 'Document is not readable',
          },
        });

        const response = await verifyDocument(request, { params: { id: doc.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.document.status).toBe('rejected');
        expect(data.data.document.rejectionReason).toBe('Document is not readable');
      });

      it('should require reason for rejection', async () => {
        const doc = await prisma.vendorDocument.create({
          data: {
            vendorId: testVendorData.vendor.id,
            type: 'food_safety',
            fileUrl: 'https://example.com/food.pdf',
            fileName: 'food.pdf',
            status: 'pending',
            isRequired: false,
          },
        });

        const request = createMockRequest('POST', `/api/admin/documents/${doc.id}/verify`, {
          headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
          body: { status: 'rejected' },
        });

        const response = await verifyDocument(request, { params: { id: doc.id } });
        expect(response.status).toBe(422);
      });
    });
  });

  describe('GET /api/admin/analytics', () => {
    it('should return analytics data', async () => {
      const request = createMockRequest('GET', '/api/admin/analytics', {
        headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
      });

      const response = await getAnalytics(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.period).toBeDefined();
      expect(data.data.reservations).toBeDefined();
      expect(data.data.credits).toBeDefined();
      expect(data.data.growth).toBeDefined();
    });

    it('should support custom period', async () => {
      const request = createMockRequest('GET', '/api/admin/analytics', {
        headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
        searchParams: { period: '7' },
      });

      const response = await getAnalytics(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.period).toContain('7');
    });

    it('should include top vendors', async () => {
      const request = createMockRequest('GET', '/api/admin/analytics', {
        headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
      });

      const response = await getAnalytics(request);
      const data = await parseResponse(response);

      expect(data.data.topVendors).toBeDefined();
      expect(Array.isArray(data.data.topVendors)).toBe(true);
    });
  });
});
