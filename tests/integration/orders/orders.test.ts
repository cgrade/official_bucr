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
import { POST as createOrder } from '@/app/api/orders/route';
import { GET as getOrder, DELETE as cancelOrder } from '@/app/api/orders/[id]/route';
import { POST as confirmPayment } from '@/app/api/orders/[id]/confirm-payment/route';
import { GET as getVendorOrders } from '@/app/api/vendor/orders/route';
import { PATCH as updateOrderStatus } from '@/app/api/vendor/orders/[id]/status/route';

describe('Orders API Integration Tests', () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let userTokens: { accessToken: string; refreshToken: string };
  let testVendorData: Awaited<ReturnType<typeof createTestVendor>>;
  let vendorTokens: { accessToken: string; refreshToken: string };
  let menuItem: { id: string; name: string; price: number };

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Create test user
    testUser = await createTestUser({
      email: `orderuser-${Date.now()}@test.com`,
      phone: `+234815${Date.now().toString().slice(-7)}`,
    });
    userTokens = await generateTestTokens(testUser.id, 'user', testUser.email);

    // Create test vendor with delivery enabled
    testVendorData = await createTestVendor({
      slug: `order-vendor-${Date.now()}`,
    });
    
    // Enable delivery for vendor
    await prisma.vendor.update({
      where: { id: testVendorData.vendor.id },
      data: {
        deliveryEnabled: true,
        deliveryFeeType: 'flat',
        deliveryFlatFee: 150000, // ₦1,500
        minDeliveryOrder: 200000, // ₦2,000
      },
    });

    vendorTokens = await generateTestTokens(
      testVendorData.owner.id,
      'vendor',
      testVendorData.owner.email
    );

    // Create menu item
    const category = await prisma.menuCategory.create({
      data: {
        vendorId: testVendorData.vendor.id,
        name: 'Main Dishes',
        sortOrder: 1,
      },
    });

    const item = await prisma.menu.create({
      data: {
        vendorId: testVendorData.vendor.id,
        categoryId: category.id,
        name: 'Jollof Rice',
        description: 'Delicious Nigerian rice',
        price: 350000, // ₦3,500
        sortOrder: 1,
      },
    });

    menuItem = { id: item.id, name: item.name, price: item.price };
  });

  describe('User Order Endpoints', () => {
    describe('POST /api/orders', () => {
      it('should create a pickup order successfully', async () => {
        const request = createMockRequest('POST', '/api/orders', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: {
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            orderType: 'pickup',
            items: [
              {
                menuItemId: menuItem.id,
                name: menuItem.name,
                quantity: 2,
                price: menuItem.price,
              },
            ],
          },
        });

        const response = await createOrder(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(201);
        expect(data.data.orderType).toBe('pickup');
        expect(data.data.status).toBe('pending');
        expect(data.data.reference).toBeDefined();
      });

      it('should create a delivery order successfully', async () => {
        const request = createMockRequest('POST', '/api/orders', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: {
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            orderType: 'delivery',
            items: [
              {
                menuItemId: menuItem.id,
                name: menuItem.name,
                quantity: 2,
                price: menuItem.price,
              },
            ],
            deliveryAddress: '123 Test Street, Victoria Island',
            deliveryCity: 'Lagos',
          },
        });

        const response = await createOrder(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(201);
        expect(data.data.orderType).toBe('delivery');
        expect(data.data.deliveryFee).toBe(150000);
        expect(data.data.deliveryAddress).toBe('123 Test Street, Victoria Island');
      });

      it('should calculate totals correctly', async () => {
        const request = createMockRequest('POST', '/api/orders', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: {
            vendorId: testVendorData.vendor.id,
            orderType: 'delivery',
            items: [
              {
                menuItemId: menuItem.id,
                name: menuItem.name,
                quantity: 3,
                price: menuItem.price, // 350000 x 3 = 1,050,000
              },
            ],
            deliveryAddress: '123 Test Street',
            deliveryCity: 'Lagos',
          },
        });

        const response = await createOrder(request);
        const data = await parseResponse(response);

        expect(data.data.subtotal).toBe(1050000);
        expect(data.data.deliveryFee).toBe(150000);
        expect(data.data.total).toBe(1200000);
      });

      it('should include payment details in response', async () => {
        const request = createMockRequest('POST', '/api/orders', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: {
            vendorId: testVendorData.vendor.id,
            orderType: 'pickup',
            items: [
              {
                menuItemId: menuItem.id,
                name: menuItem.name,
                quantity: 1,
                price: menuItem.price,
              },
            ],
          },
        });

        const response = await createOrder(request);
        const data = await parseResponse(response);

        expect(data.data.paymentDetails).toBeDefined();
      });

      it('should reject delivery order without address', async () => {
        const request = createMockRequest('POST', '/api/orders', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: {
            vendorId: testVendorData.vendor.id,
            orderType: 'delivery',
            items: [
              {
                menuItemId: menuItem.id,
                name: menuItem.name,
                quantity: 1,
                price: menuItem.price,
              },
            ],
          },
        });

        const response = await createOrder(request);
        expect(response.status).toBe(422);
      });

      it('should reject order with empty items', async () => {
        const request = createMockRequest('POST', '/api/orders', {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
          body: {
            vendorId: testVendorData.vendor.id,
            orderType: 'pickup',
            items: [],
          },
        });

        const response = await createOrder(request);
        expect(response.status).toBe(422);
      });
    });

    describe('GET /api/orders/[id]', () => {
      it('should return order details', async () => {
        const order = await prisma.takeoutOrder.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            branchId: testVendorData.branch.id,
            reference: `ORD-TEST-${Date.now()}`,
            orderType: 'pickup',
            items: [{ name: 'Test Item', quantity: 1, price: 100000 }],
            subtotal: 100000,
            deliveryFee: 0,
            total: 100000,
            status: 'pending',
          },
        });

        const request = createMockRequest('GET', `/api/orders/${order.id}`, {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        });

        const response = await getOrder(request, { params: { id: order.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.id).toBe(order.id);
        expect(data.data.reference).toBe(order.reference);
      });

      it('should not allow access to other user\'s order', async () => {
        const otherUser = await createTestUser({
          email: `other-order-${Date.now()}@test.com`,
          phone: `+234816${Date.now().toString().slice(-7)}`,
        });

        const order = await prisma.takeoutOrder.create({
          data: {
            userId: otherUser.id,
            vendorId: testVendorData.vendor.id,
            reference: `ORD-OTHER-${Date.now()}`,
            orderType: 'pickup',
            items: [],
            subtotal: 0,
            deliveryFee: 0,
            total: 0,
            status: 'pending',
          },
        });

        const request = createMockRequest('GET', `/api/orders/${order.id}`, {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        });

        const response = await getOrder(request, { params: { id: order.id } });
        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/orders/[id]/confirm-payment', () => {
      it('should confirm payment and update status', async () => {
        const order = await prisma.takeoutOrder.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            reference: `ORD-PAY-${Date.now()}`,
            orderType: 'pickup',
            items: [],
            subtotal: 100000,
            deliveryFee: 0,
            total: 100000,
            status: 'pending',
          },
        });

        const request = createMockRequest('POST', `/api/orders/${order.id}/confirm-payment`, {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        });

        const response = await confirmPayment(request, { params: { id: order.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.paymentConfirmed).toBe(true);
        expect(data.data.status).toBe('confirmed');
      });
    });

    describe('DELETE /api/orders/[id]', () => {
      it('should cancel pending order', async () => {
        const order = await prisma.takeoutOrder.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            reference: `ORD-CAN-${Date.now()}`,
            orderType: 'pickup',
            items: [],
            subtotal: 100000,
            deliveryFee: 0,
            total: 100000,
            status: 'pending',
          },
        });

        const request = createMockRequest('DELETE', `/api/orders/${order.id}`, {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        });

        const response = await cancelOrder(request, { params: { id: order.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.status).toBe('cancelled');
      });

      it('should not cancel order in progress', async () => {
        const order = await prisma.takeoutOrder.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            reference: `ORD-PROG-${Date.now()}`,
            orderType: 'pickup',
            items: [],
            subtotal: 100000,
            deliveryFee: 0,
            total: 100000,
            status: 'preparing',
          },
        });

        const request = createMockRequest('DELETE', `/api/orders/${order.id}`, {
          headers: { Authorization: `Bearer ${userTokens.accessToken}` },
        });

        const response = await cancelOrder(request, { params: { id: order.id } });
        expect(response.status).toBe(400);
      });
    });
  });

  describe('Vendor Order Endpoints', () => {
    describe('GET /api/vendor/orders', () => {
      it('should return vendor orders', async () => {
        // Create an order for this vendor
        await prisma.takeoutOrder.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            reference: `ORD-V-${Date.now()}`,
            orderType: 'pickup',
            items: [],
            subtotal: 100000,
            deliveryFee: 0,
            total: 100000,
            status: 'pending',
          },
        });

        const request = createMockRequest('GET', '/api/vendor/orders', {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
        });

        const response = await getVendorOrders(request);
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBeGreaterThan(0);
      });

      it('should filter today\'s orders', async () => {
        const request = createMockRequest('GET', '/api/vendor/orders', {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          searchParams: { today: 'true' },
        });

        const response = await getVendorOrders(request);
        expect(response.status).toBe(200);
      });

      it('should filter by status', async () => {
        const request = createMockRequest('GET', '/api/vendor/orders', {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          searchParams: { status: 'pending' },
        });

        const response = await getVendorOrders(request);
        expect(response.status).toBe(200);
      });

      it('should filter by order type', async () => {
        const request = createMockRequest('GET', '/api/vendor/orders', {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          searchParams: { orderType: 'delivery' },
        });

        const response = await getVendorOrders(request);
        expect(response.status).toBe(200);
      });
    });

    describe('PATCH /api/vendor/orders/[id]/status', () => {
      it('should update order to preparing', async () => {
        const order = await prisma.takeoutOrder.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            reference: `ORD-ST-${Date.now()}`,
            orderType: 'pickup',
            items: [],
            subtotal: 100000,
            deliveryFee: 0,
            total: 100000,
            status: 'confirmed',
            paymentConfirmed: true,
          },
        });

        const request = createMockRequest('PATCH', `/api/vendor/orders/${order.id}/status`, {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          body: { status: 'preparing' },
        });

        const response = await updateOrderStatus(request, { params: { id: order.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.status).toBe('preparing');
      });

      it('should update order to ready', async () => {
        const order = await prisma.takeoutOrder.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            reference: `ORD-RDY-${Date.now()}`,
            orderType: 'pickup',
            items: [],
            subtotal: 100000,
            deliveryFee: 0,
            total: 100000,
            status: 'preparing',
          },
        });

        const request = createMockRequest('PATCH', `/api/vendor/orders/${order.id}/status`, {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          body: { status: 'ready' },
        });

        const response = await updateOrderStatus(request, { params: { id: order.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.status).toBe('ready');
      });

      it('should update order to completed', async () => {
        const order = await prisma.takeoutOrder.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            reference: `ORD-COMP-${Date.now()}`,
            orderType: 'pickup',
            items: [],
            subtotal: 100000,
            deliveryFee: 0,
            total: 100000,
            status: 'ready',
          },
        });

        const request = createMockRequest('PATCH', `/api/vendor/orders/${order.id}/status`, {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          body: { status: 'completed' },
        });

        const response = await updateOrderStatus(request, { params: { id: order.id } });
        const data = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(data.data.status).toBe('completed');
        expect(data.data.completedAt).toBeDefined();
      });

      it('should reject invalid status transition', async () => {
        const order = await prisma.takeoutOrder.create({
          data: {
            userId: testUser.id,
            vendorId: testVendorData.vendor.id,
            reference: `ORD-INV-${Date.now()}`,
            orderType: 'pickup',
            items: [],
            subtotal: 100000,
            deliveryFee: 0,
            total: 100000,
            status: 'pending', // Cannot go directly to completed
          },
        });

        const request = createMockRequest('PATCH', `/api/vendor/orders/${order.id}/status`, {
          headers: { Authorization: `Bearer ${vendorTokens.accessToken}` },
          body: { status: 'completed' },
        });

        const response = await updateOrderStatus(request, { params: { id: order.id } });
        expect(response.status).toBe(400);
      });
    });
  });
});
