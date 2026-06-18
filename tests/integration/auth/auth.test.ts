import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestUser,
  createTestVendor,
  createTestAdmin,
  cleanupTestData,
  createMockRequest,
  parseResponse,
  prisma,
} from '../../utils/test-helpers';
import { POST as registerUser } from '@/app/api/auth/register/route';
import { POST as loginUser } from '@/app/api/auth/login/route';
import { POST as refreshToken } from '@/app/api/auth/refresh/route';
import { GET as getMe } from '@/app/api/auth/me/route';
import { POST as registerVendor } from '@/app/api/auth/vendor/register/route';
import { POST as loginVendor } from '@/app/api/auth/vendor/login/route';
import { POST as loginAdmin } from '@/app/api/auth/admin/login/route';
import { signAccessToken } from '@/lib/auth/jwt';

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const request = createMockRequest('POST', '/api/auth/register', {
        body: {
          email: `newuser-${Date.now()}@test.com`,
          password: 'SecurePass123!',
          name: 'New User',
          phone: `+234801${Date.now().toString().slice(-7)}`,
        },
      });

      const response = await registerUser(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.tokens.accessToken).toBeDefined();
      expect(data.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject registration with existing email', async () => {
      const email = `existing-${Date.now()}@test.com`;
      
      // First registration
      await createTestUser({ email, phone: `+234802${Date.now().toString().slice(-7)}` });

      // Try to register again
      const request = createMockRequest('POST', '/api/auth/register', {
        body: {
          email,
          password: 'SecurePass123!',
          name: 'Duplicate User',
          phone: `+234803${Date.now().toString().slice(-7)}`,
        },
      });

      const response = await registerUser(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const request = createMockRequest('POST', '/api/auth/register', {
        body: {
          email: 'invalid-email',
          password: 'SecurePass123!',
          name: 'Test User',
          phone: '+2348011111111',
        },
      });

      const response = await registerUser(request);
      expect(response.status).toBe(422);
    });

    it('should reject weak password', async () => {
      const request = createMockRequest('POST', '/api/auth/register', {
        body: {
          email: `weakpass-${Date.now()}@test.com`,
          password: '123', // Too short
          name: 'Test User',
          phone: '+2348011111111',
        },
      });

      const response = await registerUser(request);
      expect(response.status).toBe(422);
    });

    it('should handle referral code correctly', async () => {
      // Create referring user
      const referrer = await createTestUser({
        email: `referrer-${Date.now()}@test.com`,
        phone: `+234804${Date.now().toString().slice(-7)}`,
      });

      const request = createMockRequest('POST', '/api/auth/register', {
        body: {
          email: `referred-${Date.now()}@test.com`,
          password: 'SecurePass123!',
          name: 'Referred User',
          phone: `+234805${Date.now().toString().slice(-7)}`,
          referralCode: referrer.referralCode,
        },
      });

      const response = await registerUser(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: `loginuser-${Date.now()}@test.com`,
        phone: `+234806${Date.now().toString().slice(-7)}`,
      });
    });

    it('should login with valid credentials', async () => {
      const request = createMockRequest('POST', '/api/auth/login', {
        body: {
          email: testUser.email,
          password: 'TestPassword123!',
        },
      });

      const response = await loginUser(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe(testUser.email);
      expect(data.data.accessToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const request = createMockRequest('POST', '/api/auth/login', {
        body: {
          email: testUser.email,
          password: 'WrongPassword123!',
        },
      });

      const response = await loginUser(request);
      expect(response.status).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const request = createMockRequest('POST', '/api/auth/login', {
        body: {
          email: 'nonexistent@test.com',
          password: 'AnyPassword123!',
        },
      });

      const response = await loginUser(request);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const user = await createTestUser({
        email: `refreshuser-${Date.now()}@test.com`,
        phone: `+234807${Date.now().toString().slice(-7)}`,
      });

      // First login to get tokens
      const loginRequest = createMockRequest('POST', '/api/auth/login', {
        body: { email: user.email, password: 'TestPassword123!' },
      });
      const loginResponse = await loginUser(loginRequest);
      const loginData = await parseResponse(loginResponse);

      // Use refresh token
      const refreshRequest = createMockRequest('POST', '/api/auth/refresh', {
        body: { refreshToken: loginData.data.refreshToken },
      });

      const response = await refreshToken(refreshRequest);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.accessToken).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const request = createMockRequest('POST', '/api/auth/refresh', {
        body: { refreshToken: 'invalid-token' },
      });

      const response = await refreshToken(request);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const user = await createTestUser({
        email: `meuser-${Date.now()}@test.com`,
        phone: `+234808${Date.now().toString().slice(-7)}`,
      });

      const token = await signAccessToken({
        sub: user.id,
        email: user.email,
        role: 'user',
      });

      const request = createMockRequest('GET', '/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const response = await getMe(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.type).toBe('user');
      expect(data.data.data.email).toBe(user.email);
      expect(data.data.data.name).toBe(user.name);
    });

    it('should reject request without token', async () => {
      const request = createMockRequest('GET', '/api/auth/me');

      const response = await getMe(request);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/vendor/register', () => {
    it('should register a new vendor successfully', async () => {
      const timestamp = Date.now();
      const request = createMockRequest('POST', '/api/auth/vendor/register', {
        body: {
          ownerName: 'Vendor Owner',
          ownerEmail: `vendorowner-${timestamp}@test.com`,
          ownerPhone: `+234809${timestamp.toString().slice(-7)}`,
          password: 'VendorPass123!',
          businessName: `Test Restaurant ${timestamp}`,
          description: 'A test restaurant for integration testing',
          cuisineTypes: ['Nigerian', 'Continental'],
          address: '123 Test Street',
          city: 'Lagos',
          state: 'Lagos',
        },
      });

      const response = await registerVendor(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.vendor).toBeDefined();
      expect(data.data.vendor.businessName).toContain('Test Restaurant');
    });

    it('should create main branch automatically', async () => {
      const timestamp = Date.now();
      const request = createMockRequest('POST', '/api/auth/vendor/register', {
        body: {
          ownerName: 'Branch Owner',
          ownerEmail: `branchowner-${timestamp}@test.com`,
          ownerPhone: `+234810${timestamp.toString().slice(-7)}`,
          password: 'VendorPass123!',
          businessName: `Branch Test ${timestamp}`,
          description: 'Testing branch creation',
          cuisineTypes: ['Nigerian'],
          address: '456 Branch Street',
          city: 'Abuja',
          state: 'FCT',
        },
      });

      const response = await registerVendor(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      
      // Verify branch was created
      const vendor = await prisma.vendor.findFirst({
        where: { businessName: { contains: `Branch Test ${timestamp}` } },
        include: { branches: true },
      });

      expect(vendor?.branches.length).toBe(1);
      expect(vendor?.branches[0].isMainBranch).toBe(true);
    });
  });

  describe('POST /api/auth/vendor/login', () => {
    it('should login vendor with valid credentials', async () => {
      const { owner, vendor } = await createTestVendor();

      const request = createMockRequest('POST', '/api/auth/vendor/login', {
        body: {
          email: owner.email,
          password: 'VendorOwner123!',
        },
      });

      const response = await loginVendor(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.vendor.id).toBe(vendor.id);
    });
  });

  describe('POST /api/auth/admin/login', () => {
    it('should login admin with valid credentials', async () => {
      const admin = await createTestAdmin();

      const request = createMockRequest('POST', '/api/auth/admin/login', {
        body: {
          email: admin.email,
          password: 'AdminPass123!',
        },
      });

      const response = await loginAdmin(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data.admin.role).toBe('admin');
    });

    it('should reject non-admin users', async () => {
      const user = await createTestUser({
        email: `notadmin-${Date.now()}@test.com`,
        phone: `+234811${Date.now().toString().slice(-7)}`,
      });

      const request = createMockRequest('POST', '/api/auth/admin/login', {
        body: {
          email: user.email,
          password: 'TestPassword123!',
        },
      });

      const response = await loginAdmin(request);
      expect(response.status).toBe(401);
    });
  });
});
