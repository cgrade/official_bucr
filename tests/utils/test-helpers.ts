import { PrismaClient } from '@prisma/client';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { hashPassword } from '@/lib/auth/password';
import { NextRequest } from 'next/server';

// Lazy PrismaClient: uses testcontainer DB if DATABASE_URL was set by global setup,
// otherwise creates a default client
let _prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!_prisma) {
    const url = process.env.DATABASE_URL;
    _prisma = new PrismaClient({
      datasources: url ? { db: { url } } : undefined,
      log: ['error'],
    });
  }
  return _prisma;
}

// Allow external code (testcontainers) to inject a PrismaClient
export function setPrisma(client: PrismaClient) {
  _prisma = client;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  },
});

// Test data factories
export const testUserData = {
  email: 'testuser@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
  phone: '+2348011111111',
};

export const testVendorData = {
  businessName: 'Test Restaurant',
  slug: 'test-restaurant',
  description: 'A test restaurant',
  cuisineTypes: ['Nigerian', 'Continental'],
  email: 'vendor@test.com',
  phone: '+2348022222222',
};

export const testAdminData = {
  email: 'testadmin@bucr.ng',
  password: 'AdminPass123!',
  name: 'Test Admin',
};

// Create test user
export async function createTestUser(overrides: Partial<typeof testUserData> = {}) {
  const data = { ...testUserData, ...overrides };
  const passwordHash = await hashPassword(data.password);
  
  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      phone: data.phone,
      creditsBalance: 100,
      referralCode: `REF-${Date.now()}`,
    },
  });
}

// Create test vendor with owner
export async function createTestVendor(overrides: Partial<typeof testVendorData> = {}) {
  const data = { ...testVendorData, ...overrides };
  const ownerPasswordHash = await hashPassword('VendorOwner123!');
  
  // Create owner user
  const owner = await prisma.user.create({
    data: {
      email: `owner-${Date.now()}@test.com`,
      passwordHash: ownerPasswordHash,
      name: 'Vendor Owner',
      phone: `+234801${Date.now().toString().slice(-7)}`,
    },
  });

  // Create vendor
  const vendor = await prisma.vendor.create({
    data: {
      ownerId: owner.id,
      businessName: data.businessName,
      slug: `${data.slug}-${Date.now()}`,
      description: data.description,
      cuisineTypes: data.cuisineTypes,
      email: data.email,
      phone: data.phone,
      verificationStatus: 'approved',
      subscriptionTier: 'pro',
      subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // Create main branch
  const branch = await prisma.vendorBranch.create({
    data: {
      vendorId: vendor.id,
      name: 'Main Branch',
      address: '123 Test Street',
      city: 'Lagos',
      state: 'Lagos',
      isMainBranch: true,
      isActive: true,
      operatingHours: [
        { dayOfWeek: 0, openTime: '09:00', closeTime: '22:00', isClosed: false },
        { dayOfWeek: 1, openTime: '09:00', closeTime: '22:00', isClosed: false },
        { dayOfWeek: 2, openTime: '09:00', closeTime: '22:00', isClosed: false },
        { dayOfWeek: 3, openTime: '09:00', closeTime: '22:00', isClosed: false },
        { dayOfWeek: 4, openTime: '09:00', closeTime: '22:00', isClosed: false },
        { dayOfWeek: 5, openTime: '09:00', closeTime: '23:00', isClosed: false },
        { dayOfWeek: 6, openTime: '09:00', closeTime: '23:00', isClosed: false },
      ],
    },
  });

  return { vendor, owner, branch };
}

// Create test admin
export async function createTestAdmin(overrides: Partial<typeof testAdminData> = {}) {
  const data = { ...testAdminData, ...overrides };
  const passwordHash = await hashPassword(data.password);
  
  return prisma.admin.create({
    data: {
      email: `admin-${Date.now()}@bucr.ng`,
      passwordHash,
      name: data.name,
      role: 'admin',
      permissions: ['users', 'vendors', 'orders'],
    },
  });
}

// Generate auth tokens for testing
export async function generateTestTokens(userId: string, role: 'user' | 'vendor' | 'admin', email: string) {
  const accessToken = await signAccessToken({ sub: userId, email, role });
  const refreshToken = await signRefreshToken({ sub: userId, email, role });
  return { accessToken, refreshToken };
}

// Create mock NextRequest
export function createMockRequest(
  method: string,
  url: string,
  options: {
    body?: object;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { body, headers = {}, searchParams = {} } = options;
  
  const urlObj = new URL(url, 'http://localhost:3000');
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(urlObj, requestInit);
}

// Clean up test data
export async function cleanupTestData() {
  // Delete in order of dependencies. Use a helper that ignores models which
  // may not exist in older schemas, so cleanup never aborts mid-way.
  const del = async (fn: () => Promise<unknown>) => {
    try { await fn(); } catch { /* model absent or already empty — ignore */ }
  };

  // Financial / ledger children that FK to reservation, vendor, or user — must
  // be cleared BEFORE the rows they reference (per-cover fees, wallet ledgers, etc.)
  await del(() => (prisma as any).coverCharge?.deleteMany({}));
  await del(() => (prisma as any).platformRevenue?.deleteMany({}));
  await del(() => (prisma as any).vendorCreditTransaction?.deleteMany({}));
  await del(() => (prisma as any).vendorWallet?.deleteMany({}));
  await del(() => (prisma as any).gift?.deleteMany({}));
  await del(() => (prisma as any).payment?.deleteMany({}));
  await del(() => (prisma as any).notification?.deleteMany({}));

  await prisma.creditTransaction.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.waitlist.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.takeoutOrder.deleteMany({});
  await prisma.guestProfile.deleteMany({});
  await prisma.menu.deleteMany({});
  await prisma.menuCategory.deleteMany({});
  await prisma.galleryImage.deleteMany({});
  await prisma.experience.deleteMany({});
  await prisma.achievement.deleteMany({});
  await prisma.vendorDocument.deleteMany({});
  await prisma.vendorBranch.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.admin.deleteMany({});
}

// Parse JSON response from NextResponse or mock response
export async function parseResponse(response: any) {
  if (typeof response.text === 'function') {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  // Mock NextResponse object from integration-setup
  if (typeof response.json === 'function') {
    return response.json();
  }
  return response;
}

export { prisma };
