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
import { POST as createReservation } from '@/app/api/reservations/route';
import { GET as getReservation, PATCH as modifyReservation, DELETE as cancelReservation } from '@/app/api/reservations/[id]/route';
import { GET as getVendorReservations } from '@/app/api/vendor/reservations/route';
import { POST as checkIn } from '@/app/api/vendor/reservations/[id]/check-in/route';
import { POST as markNoShow } from '@/app/api/vendor/reservations/[id]/no-show/route';
import { ECONOMICS } from '@/lib/config/economics';

// Test vendor uses the schema default venueType (upscale_casual) → flat deposit
// is the upscale_casual rate. Party size never changes the deposit.
const EXPECTED_DEPOSIT =
  ECONOMICS.DEPOSIT_BY_VENUE_TYPE.upscale_casual ?? ECONOMICS.DEPOSIT_DEFAULT;
const TEST_BALANCE = EXPECTED_DEPOSIT * 5; // comfortably above one flat deposit

describe('Reservations API Integration Tests', () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let userTokens: { accessToken: string; refreshToken: string };
  let testVendorData: Awaited<ReturnType<typeof createTestVendor>>;
  let vendorTokens: { accessToken: string; refreshToken: string };

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Create test user with sufficient credits
    testUser = await createTestUser({
      email: `resuser-${Date.now()}@test.com`,
      phone: `+234813${Date.now().toString().slice(-7)}`,
    });
    await prisma.user.update({
      where: { id: testUser.id },
      data: { creditsBalance: TEST_BALANCE },
    });
    userTokens = await generateTestTokens(testUser.id, 'user', testUser.email);

    // Create test vendor
    testVendorData = await createTestVendor({
      slug: `res-vendor-${Date.now()}`,
    });
    vendorTokens = await generateTestTokens(
      testVendorData.owner.id,
      'vendor',
      testVendorData.owner.email
    );
  });

  describe('User Reservation Endpoints', () => {
    describe('POST /api/reservations', () => {
      it('should create a reservation successfully', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const request = createMockRequest('POST', '/api/reservations', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: {
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            date: futureDate.toISOString(),
            time: '19:00',
            partySize: 2,
          },
        });

        const response = await createReservation(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(201);
        expect(data.data.status).toBe('confirmed');
        expect(data.data.pin).toBeDefined();
        expect(data.data.qrCode).toBeDefined();
      });

      it('should deduct credits from user balance', async () => {
        const initialBalance = TEST_BALANCE;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const request = createMockRequest('POST', '/api/reservations', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: {
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            date: futureDate.toISOString(),
            time: '19:00',
            partySize: 2, // flat deposit — party size does not change the amount
          },
        });

        await createReservation(request);

        const user = await prisma.user.findUnique({ where: { id: testUser.id } });
        expect(user?.creditsBalance).toBe(initialBalance - EXPECTED_DEPOSIT);
      });

      it('should reject reservation with insufficient credits', async () => {
        await prisma.user.update({
          where: { id: testUser.id },
          data: { creditsBalance: 10 },
        });

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const request = createMockRequest('POST', '/api/reservations', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: {
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            date: futureDate.toISOString(),
            time: '19:00',
            partySize: 2,
          },
        });

        const response = await createReservation(request);
        expect(response.status).toBe(400);
      });

      it('should reject past date reservation', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        const request = createMockRequest('POST', '/api/reservations', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: {
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            date: pastDate.toISOString(),
            time: '19:00',
            partySize: 2,
          },
        });

        const response = await createReservation(request);
        expect(response.status).toBe(400);
      });

      it('should include special requests', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const request = createMockRequest('POST', '/api/reservations', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: {
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            date: futureDate.toISOString(),
            time: '19:00',
            partySize: 4,
            specialRequests: 'Birthday celebration, need cake',
            occasion: 'birthday',
          },
        });

        const response = await createReservation(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(201);
        expect(data.data.specialRequests).toBe('Birthday celebration, need cake');
        expect(data.data.occasion).toBe('birthday');
      });
    });

    describe('GET /api/reservations/[id]', () => {
      it('should return reservation details', async () => {
        // Create reservation first
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const reservation = await prisma.reservation.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            reference: `BKR-TEST-${Date.now()}`,
            date: futureDate,
            time: '19:00',
            partySize: 2,
            creditsDeposited: 50,
            status: 'confirmed',
            pin: '1234',
            qrCode: 'test-qr',
          },
        });

        const request = createMockRequest('GET', `/api/reservations/${reservation.id}`, {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        });

        const response = await getReservation(request, { params: { id: reservation.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.id).toBe(reservation.id);
      });

      it('should not allow access to other user\'s reservation', async () => {
        // Create another user and their reservation
        const otherUser = await createTestUser({
          email: `other-${Date.now()}@test.com`,
          phone: `+234814${Date.now().toString().slice(-7)}`,
        });

        const reservation = await prisma.reservation.create({
          data: {
            userId: otherUser.id,
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            reference: `BKR-OTHER-${Date.now()}`,
            date: new Date(),
            time: '19:00',
            partySize: 2,
            creditsDeposited: 50,
            status: 'confirmed',
            pin: '1234',
            qrCode: 'test-qr',
          },
        });

        const request = createMockRequest('GET', `/api/reservations/${reservation.id}`, {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        });

        const response = await getReservation(request, { params: { id: reservation.id } });
        expect(response.status).toBe(401);
      });
    });

    describe('PATCH /api/reservations/[id]', () => {
      it('should modify reservation date and time', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const reservation = await prisma.reservation.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            reference: `BKR-MOD-${Date.now()}`,
            date: futureDate,
            time: '19:00',
            partySize: 2,
            creditsDeposited: 50,
            status: 'confirmed',
            pin: '1234',
            qrCode: 'test-qr',
          },
        });

        const newDate = new Date();
        newDate.setDate(newDate.getDate() + 8);

        const request = createMockRequest('PATCH', `/api/reservations/${reservation.id}`, {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: {
            date: newDate.toISOString(),
            time: '20:00',
          },
        });

        const response = await modifyReservation(request, { params: { id: reservation.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.time).toBe('20:00');
      });
    });

    describe('DELETE /api/reservations/[id]', () => {
      it('should cancel reservation and refund credits', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const reservation = await prisma.reservation.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            reference: `BKR-CAN-${Date.now()}`,
            date: futureDate,
            time: '19:00',
            partySize: 2,
            creditsDeposited: 50,
            status: 'confirmed',
            pin: '1234',
            qrCode: 'test-qr',
          },
        });

        const balanceBefore = (await prisma.user.findUnique({ where: { id: testUser.id } }))!.creditsBalance;

        const request = createMockRequest('DELETE', `/api/reservations/${reservation.id}`, {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        });

        const response = await cancelReservation(request, { params: { id: reservation.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.reservation.status).toBe('cancelled');

        // Check refund
        const userAfter = await prisma.user.findUnique({ where: { id: testUser.id } });
        expect(userAfter!.creditsBalance).toBe(balanceBefore + 50); // Full refund
      });
    });
  });

  describe('Vendor Reservation Endpoints', () => {
    describe('GET /api/vendor/reservations', () => {
      it('should return vendor reservations', async () => {
        const request = createMockRequest('GET', '/api/vendor/reservations', {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
        });

        const response = await getVendorReservations(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(Array.isArray(data.data)).toBe(true);
      });

      it('should filter by date', async () => {
        const today = new Date().toISOString().split('T')[0];

        const request = createMockRequest('GET', '/api/vendor/reservations', {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          searchParams: { date: today },
        });

        const response = await getVendorReservations(request);
        expect(response.status).toBe(200);
      });

      it('should filter by status', async () => {
        const request = createMockRequest('GET', '/api/vendor/reservations', {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          searchParams: { status: 'confirmed' },
        });

        const response = await getVendorReservations(request);
        expect(response.status).toBe(200);
      });
    });

    describe('POST /api/vendor/reservations/[id]/check-in', () => {
      it('should check in guest with valid PIN', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        const reservation = await prisma.reservation.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            reference: `BKR-CHK-${Date.now()}`,
            date: futureDate,
            time: '19:00',
            partySize: 2,
            creditsDeposited: 50,
            status: 'confirmed',
            pin: '1234',
            qrCode: 'test-qr',
          },
        });

        const request = createMockRequest('POST', `/api/vendor/reservations/${reservation.id}/check-in`, {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          body: { pin: '1234' },
        });

        const response = await checkIn(request, { params: { id: reservation.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.reservation.status).toBe('checked_in');
        expect(data.data.creditsRefunded).toBeGreaterThan(0);
      });

      it('should reject invalid PIN', async () => {
        const reservation = await prisma.reservation.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            reference: `BKR-BAD-${Date.now()}`,
            date: new Date(),
            time: '19:00',
            partySize: 2,
            creditsDeposited: 50,
            status: 'confirmed',
            pin: '1234',
            qrCode: 'test-qr',
          },
        });

        const request = createMockRequest('POST', `/api/vendor/reservations/${reservation.id}/check-in`, {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          body: { pin: '9999' },
        });

        const response = await checkIn(request, { params: { id: reservation.id } });
        expect(response.status).toBe(400);
      });
    });

    describe('POST /api/vendor/reservations/[id]/no-show', () => {
      it('should mark reservation as no-show', async () => {
        const reservation = await prisma.reservation.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            reference: `BKR-NS-${Date.now()}`,
            date: new Date(),
            time: '19:00',
            partySize: 2,
            creditsDeposited: 50,
            status: 'confirmed',
            pin: '1234',
            qrCode: 'test-qr',
          },
        });

        const request = createMockRequest('POST', `/api/vendor/reservations/${reservation.id}/no-show`, {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
        });

        const response = await markNoShow(request, { params: { id: reservation.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);

        // Verify status updated
        const updated = await prisma.reservation.findUnique({ where: { id: reservation.id } });
        expect(updated?.status).toBe('no_show');
      });
    });
  });
});
