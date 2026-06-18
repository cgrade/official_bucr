import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  cleanupTestData,
  createMockRequest,
  parseResponse,
  prisma,
} from '../utils/test-helpers';
import { hashPassword } from '@/lib/auth/password';

/**
 * End-to-End Workflow Tests
 * These tests simulate complete user journeys through the system
 */

describe('E2E Workflow Tests', () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Complete User Reservation Journey', () => {
    let userId: string;
    let vendorId: string;
    let branchId: string;
    let reservationId: string;
    let userAccessToken: string;
    let vendorAccessToken: string;
    let reservationPin: string;

    it('Step 1: User registers', async () => {
      const { POST: register } = await import('@/app/api/auth/register/route');
      
      const request = createMockRequest('POST', '/api/auth/register', {
        body: {
          email: `journey-user-${Date.now()}@test.com`,
          password: 'JourneyTest123!',
          name: 'Journey User',
          phone: `+234801${Date.now().toString().slice(-7)}`,
        },
      });

      const response = await register(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      userId = data.data.user.id;
      userAccessToken = data.data.tokens.accessToken;
    });

    it('Step 2: User purchases credits', async () => {
      const { POST: purchaseCredits } = await import('@/app/api/users/credits/purchase/route');
      
      const request = createMockRequest('POST', '/api/users/credits/purchase', {
        headers: { Authorization: `Bearer ${userAccessToken}` },
        body: {
          credits: 200,
          paystackReference: `journey_ref_${Date.now()}`,
        },
      });

      const response = await purchaseCredits(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.newBalance).toBeGreaterThanOrEqual(200);
    });

    it('Step 3: User browses vendors', async () => {
      const { GET: getVendors } = await import('@/app/api/vendors/route');
      
      // Create a test vendor first
      const ownerPasswordHash = await hashPassword('VendorOwner123!');
      const owner = await prisma.user.create({
        data: {
          email: `journey-vendor-owner-${Date.now()}@test.com`,
          passwordHash: ownerPasswordHash,
          name: 'Journey Vendor Owner',
          phone: `+234805${Date.now().toString().slice(-7)}`,
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          ownerId: owner.id,
          businessName: `Journey Test Restaurant ${Date.now()}`,
          slug: `journey-restaurant-${Date.now()}`,
          description: 'E2E test restaurant',
          cuisineTypes: ['Nigerian'],
          email: 'journey@test.com',
          phone: '+2348012222222',
          verificationStatus: 'approved',
          subscriptionTier: 'pro',
          subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      const branch = await prisma.vendorBranch.create({
        data: {
          vendorId: vendor.id,
          name: 'Main Branch',
          address: '123 Journey Street',
          city: 'Lagos',
          state: 'Lagos',
          isMainBranch: true,
          isActive: true,
          operatingHours: [],
        },
      });

      vendorId = vendor.id;
      branchId = branch.id;

      // Generate vendor token
      const { signAccessToken } = await import('@/lib/auth/jwt');
      vendorAccessToken = await signAccessToken({
        sub: owner.id,
        email: owner.email,
        role: 'vendor',
      });

      const request = createMockRequest('GET', '/api/vendors');
      const response = await getVendors(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('Step 4: User adds vendor to favorites', async () => {
      const { POST: addFavorite } = await import('@/app/api/users/favorites/route');
      
      const request = createMockRequest('POST', '/api/users/favorites', {
        headers: { Authorization: `Bearer ${userAccessToken}` },
        body: { vendorId },
      });

      const response = await addFavorite(request);
      expect(response.status).toBe(201);
    });

    it('Step 5: User creates reservation', async () => {
      const { POST: createReservation } = await import('@/app/api/reservations/route');
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const request = createMockRequest('POST', '/api/reservations', {
        headers: { Authorization: `Bearer ${userAccessToken}` },
        body: {
          vendorId,
          branchId,
          date: futureDate.toISOString(),
          time: '19:00',
          partySize: 4,
          specialRequests: 'Birthday celebration',
          occasion: 'birthday',
        },
      });

      const response = await createReservation(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.data.status).toBe('confirmed');
      reservationId = data.data.id;
      reservationPin = data.data.pin;

      // Verify credits were deducted (100 for party of 4)
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.creditsBalance).toBe(100); // 200 - 100
    });

    it('Step 6: Vendor views reservations', async () => {
      const { GET: getVendorReservations } = await import('@/app/api/vendor/reservations/route');
      
      const request = createMockRequest('GET', '/api/vendor/reservations', {
        headers: { Authorization: `Bearer ${vendorAccessToken}` },
      });

      const response = await getVendorReservations(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('Step 7: Vendor checks in guest', async () => {
      const { POST: checkIn } = await import('@/app/api/vendor/reservations/[id]/check-in/route');
      
      const request = createMockRequest('POST', `/api/vendor/reservations/${reservationId}/check-in`, {
        headers: { Authorization: `Bearer ${vendorAccessToken}` },
        body: { pin: reservationPin },
      });

      const response = await checkIn(request, { params: { id: reservationId } });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.reservation.status).toBe('checked_in');
      expect(data.data.creditsRefunded).toBeGreaterThan(0);
    });

    it('Step 8: User leaves a review', async () => {
      const { POST: createReview } = await import('@/app/api/reviews/route');
      
      const request = createMockRequest('POST', '/api/reviews', {
        headers: { Authorization: `Bearer ${userAccessToken}` },
        body: {
          vendorId,
          reservationId,
          rating: 5,
          text: 'Amazing experience! The food was delicious and the service was excellent.',
        },
      });

      const response = await createReview(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.data.creditsEarned).toBeGreaterThan(0);
    });

    it('Step 9: Verify final user credit balance', async () => {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      // Initial: 200, deducted: 100, refunded: 100 + 5 bonus + review bonus (5-10)
      expect(user!.creditsBalance).toBeGreaterThanOrEqual(105);
    });
  });

  describe('Complete Order Journey', () => {
    let userId: string;
    let vendorId: string;
    let branchId: string;
    let orderId: string;
    let userAccessToken: string;
    let vendorAccessToken: string;

    it('Step 1: Setup - Create user and vendor', async () => {
      const passwordHash = await hashPassword('OrderJourney123!');
      
      // Create user
      const user = await prisma.user.create({
        data: {
          email: `order-journey-${Date.now()}@test.com`,
          passwordHash,
          name: 'Order Journey User',
          phone: `+234803${Date.now().toString().slice(-7)}`,
        },
      });
      userId = user.id;

      const { signAccessToken } = await import('@/lib/auth/jwt');
      userAccessToken = await signAccessToken({
        sub: user.id,
        email: user.email,
        role: 'user',
      });

      // Create vendor
      const owner = await prisma.user.create({
        data: {
          email: `order-vendor-owner-${Date.now()}@test.com`,
          passwordHash,
          name: 'Order Vendor Owner',
          phone: `+234804${Date.now().toString().slice(-7)}`,
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          ownerId: owner.id,
          businessName: `Order Test Restaurant ${Date.now()}`,
          slug: `order-restaurant-${Date.now()}`,
          description: 'E2E order test restaurant',
          cuisineTypes: ['Nigerian'],
          email: 'order@test.com',
          phone: '+2348013333333',
          verificationStatus: 'approved',
          subscriptionTier: 'pro',
          subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          deliveryEnabled: true,
          deliveryFeeType: 'flat',
          deliveryFlatFee: 100000,
        },
      });
      vendorId = vendor.id;

      const branch = await prisma.vendorBranch.create({
        data: {
          vendorId: vendor.id,
          name: 'Main Branch',
          address: '456 Order Street',
          city: 'Lagos',
          state: 'Lagos',
          isMainBranch: true,
          isActive: true,
          operatingHours: [],
        },
      });
      branchId = branch.id;

      vendorAccessToken = await signAccessToken({
        sub: owner.id,
        email: owner.email,
        role: 'vendor',
      });

      // Create menu items
      const category = await prisma.menuCategory.create({
        data: {
          vendorId: vendor.id,
          name: 'Main Dishes',
          sortOrder: 1,
        },
      });

      await prisma.menu.create({
        data: {
          vendorId: vendor.id,
          categoryId: category.id,
          name: 'Jollof Rice',
          price: 350000,
          sortOrder: 1,
        },
      });
    });

    it('Step 2: User creates delivery order', async () => {
      const { POST: createOrder } = await import('@/app/api/orders/route');
      
      const menuItem = await prisma.menu.findFirst({ where: { vendorId } });

      const request = createMockRequest('POST', '/api/orders', {
        headers: { Authorization: `Bearer ${userAccessToken}` },
        body: {
          vendorId,
          branchId,
          orderType: 'delivery',
          items: [
            {
              menuItemId: menuItem!.id,
              name: menuItem!.name,
              quantity: 2,
              price: menuItem!.price,
            },
          ],
          deliveryAddress: '789 Customer Street, Victoria Island',
          deliveryCity: 'Lagos',
        },
      });

      const response = await createOrder(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      orderId = data.data.id;
      expect(data.data.paymentDetails).toBeDefined();
    });

    it('Step 3: User confirms payment', async () => {
      const { POST: confirmPayment } = await import('@/app/api/orders/[id]/confirm-payment/route');
      
      const request = createMockRequest('POST', `/api/orders/${orderId}/confirm-payment`, {
        headers: { Authorization: `Bearer ${userAccessToken}` },
      });

      const response = await confirmPayment(request, { params: { id: orderId } });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('confirmed');
    });

    it('Step 4: Vendor updates order to preparing', async () => {
      const { PATCH: updateStatus } = await import('@/app/api/vendor/orders/[id]/status/route');
      
      const request = createMockRequest('PATCH', `/api/vendor/orders/${orderId}/status`, {
        headers: { Authorization: `Bearer ${vendorAccessToken}` },
        body: { status: 'preparing' },
      });

      const response = await updateStatus(request, { params: { id: orderId } });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('preparing');
    });

    it('Step 5: Vendor updates order to ready', async () => {
      const { PATCH: updateStatus } = await import('@/app/api/vendor/orders/[id]/status/route');
      
      const request = createMockRequest('PATCH', `/api/vendor/orders/${orderId}/status`, {
        headers: { Authorization: `Bearer ${vendorAccessToken}` },
        body: { status: 'ready' },
      });

      const response = await updateStatus(request, { params: { id: orderId } });
      expect(response.status).toBe(200);
    });

    it('Step 6: Vendor updates order to out for delivery', async () => {
      const { PATCH: updateStatus } = await import('@/app/api/vendor/orders/[id]/status/route');
      
      const request = createMockRequest('PATCH', `/api/vendor/orders/${orderId}/status`, {
        headers: { Authorization: `Bearer ${vendorAccessToken}` },
        body: { status: 'out_for_delivery' },
      });

      const response = await updateStatus(request, { params: { id: orderId } });
      expect(response.status).toBe(200);
    });

    it('Step 7: Vendor completes order', async () => {
      const { PATCH: updateStatus } = await import('@/app/api/vendor/orders/[id]/status/route');
      
      const request = createMockRequest('PATCH', `/api/vendor/orders/${orderId}/status`, {
        headers: { Authorization: `Bearer ${vendorAccessToken}` },
        body: { status: 'completed' },
      });

      const response = await updateStatus(request, { params: { id: orderId } });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('completed');
      expect(data.data.completedAt).toBeDefined();
    });

    it('Step 8: User leaves review for order', async () => {
      const { POST: createReview } = await import('@/app/api/reviews/route');
      
      const request = createMockRequest('POST', '/api/reviews', {
        headers: { Authorization: `Bearer ${userAccessToken}` },
        body: {
          vendorId,
          orderId,
          rating: 4,
          text: 'Food arrived on time and was still hot. Great service!',
        },
      });

      const response = await createReview(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.data.creditsEarned).toBeGreaterThan(0);
    });
  });

  describe('Vendor Onboarding Journey', () => {
    let vendorId: string;
    let ownerId: string;
    let vendorAccessToken: string;
    let adminAccessToken: string;

    it('Step 1: Vendor registers', async () => {
      const { POST: registerVendor } = await import('@/app/api/auth/vendor/register/route');
      
      const timestamp = Date.now();
      const request = createMockRequest('POST', '/api/auth/vendor/register', {
        body: {
          ownerName: 'Onboarding Vendor Owner',
          ownerEmail: `onboarding-vendor-${timestamp}@test.com`,
          ownerPhone: `+234806${timestamp.toString().slice(-7)}`,
          password: 'OnboardVendor123!',
          businessName: `Onboarding Restaurant ${timestamp}`,
          description: 'E2E vendor onboarding test',
          cuisineTypes: ['Nigerian', 'Continental'],
          address: '999 Onboarding Street',
          city: 'Lagos',
          state: 'Lagos',
        },
      });

      const response = await registerVendor(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      vendorId = data.data.vendor.id;
      ownerId = data.data.user.id;
      vendorAccessToken = data.data.tokens.accessToken;

      // Verify pending status
      expect(data.data.vendor.verificationStatus).toBe('pending');
    });

    it('Step 2: Vendor uploads CAC document', async () => {
      const { POST: uploadDocument } = await import('@/app/api/vendor/documents/route');
      
      const request = createMockRequest('POST', '/api/vendor/documents', {
        headers: { Authorization: `Bearer ${vendorAccessToken}` },
        body: {
          type: 'cac',
          fileUrl: 'https://cloudinary.com/test/cac.pdf',
          fileName: 'CAC_Certificate.pdf',
        },
      });

      const response = await uploadDocument(request);
      expect(response.status).toBe(201);
    });

    it('Step 3: Vendor uploads TIN document', async () => {
      const { POST: uploadDocument } = await import('@/app/api/vendor/documents/route');
      
      const request = createMockRequest('POST', '/api/vendor/documents', {
        headers: { Authorization: `Bearer ${vendorAccessToken}` },
        body: {
          type: 'tin',
          fileUrl: 'https://cloudinary.com/test/tin.pdf',
          fileName: 'TIN_Certificate.pdf',
        },
      });

      const response = await uploadDocument(request);
      expect(response.status).toBe(201);
    });

    it('Step 4: Admin verifies documents', async () => {
      // Create admin
      const adminPasswordHash = await hashPassword('AdminOnboard123!');
      const admin = await prisma.admin.create({
        data: {
          email: `onboard-admin-${Date.now()}@bucr.ng`,
          passwordHash: adminPasswordHash,
          name: 'Onboard Admin',
          role: 'admin',
          permissions: ['documents'],
        },
      });

      const { signAccessToken } = await import('@/lib/auth/jwt');
      adminAccessToken = await signAccessToken({
        sub: admin.id,
        email: admin.email,
        role: 'admin',
      });

      // Get pending documents
      const documents = await prisma.vendorDocument.findMany({
        where: { vendorId },
      });

      const { POST: verifyDocument } = await import('@/app/api/admin/documents/[id]/verify/route');

      // Approve CAC
      const cacDoc = documents.find(d => d.type === 'cac');
      const cacRequest = createMockRequest('POST', `/api/admin/documents/${cacDoc!.id}/verify`, {
        headers: { Authorization: `Bearer ${adminAccessToken}` },
        body: { status: 'approved' },
      });
      await verifyDocument(cacRequest, { params: { id: cacDoc!.id } });

      // Approve TIN
      const tinDoc = documents.find(d => d.type === 'tin');
      const tinRequest = createMockRequest('POST', `/api/admin/documents/${tinDoc!.id}/verify`, {
        headers: { Authorization: `Bearer ${adminAccessToken}` },
        body: { status: 'approved' },
      });
      const response = await verifyDocument(tinRequest, { params: { id: tinDoc!.id } });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.vendorVerificationStatus).toBe('approved');
    });

    it('Step 5: Verify vendor is now approved', async () => {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      expect(vendor?.verificationStatus).toBe('approved');
    });

    it('Step 6: Vendor sets up menu', async () => {
      const { POST: createMenu } = await import('@/app/api/vendor/menu/route');
      
      // Create category
      const categoryRequest = createMockRequest('POST', '/api/vendor/menu', {
        headers: { Authorization: `Bearer ${vendorAccessToken}` },
        body: {
          type: 'category',
          name: 'Signature Dishes',
          sortOrder: 1,
        },
      });

      const categoryResponse = await createMenu(categoryRequest);
      const categoryData = await parseResponse(categoryResponse);
      expect(categoryResponse.status).toBe(201);

      // Create menu item
      const itemRequest = createMockRequest('POST', '/api/vendor/menu', {
        headers: { Authorization: `Bearer ${vendorAccessToken}` },
        body: {
          type: 'item',
          categoryId: categoryData.data.id,
          name: 'Signature Jollof',
          description: 'Our famous jollof rice',
          price: 450000,
          sortOrder: 1,
        },
      });

      const itemResponse = await createMenu(itemRequest);
      expect(itemResponse.status).toBe(201);
    });

    it('Step 7: Vendor adds gallery images', async () => {
      const { POST: addImage } = await import('@/app/api/vendor/gallery/route');
      
      const request = createMockRequest('POST', '/api/vendor/gallery', {
        headers: { Authorization: `Bearer ${vendorAccessToken}` },
        body: {
          url: 'https://cloudinary.com/test/restaurant.jpg',
          caption: 'Our beautiful dining area',
          category: 'venue',
          sortOrder: 1,
        },
      });

      const response = await addImage(request);
      expect(response.status).toBe(201);
    });

    it('Step 8: Vendor is visible in public listings', async () => {
      const { GET: getVendors } = await import('@/app/api/vendors/route');
      
      const request = createMockRequest('GET', '/api/vendors');
      const response = await getVendors(request);
      const data = await parseResponse(response);

      const ourVendor = data.data.find((v: { id: string }) => v.id === vendorId);
      expect(ourVendor).toBeDefined();
    });
  });
});
