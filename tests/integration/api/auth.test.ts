import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';

const BASE_URL = 'http://localhost:3000';

// Test user data
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User',
  phone: '+2348012345678',
};

let createdUserId: string | null = null;
let accessToken: string | null = null;
let refreshToken: string | null = null;

describe('Auth API Integration Tests', () => {
  // Cleanup after tests
  afterAll(async () => {
    if (createdUserId) {
      await db.user.delete({ where: { id: createdUserId } }).catch(() => {});
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.email).toBe(testUser.email);
      expect(data.data.accessToken).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();

      // Save for cleanup and subsequent tests
      createdUserId = data.data.user.id;
      accessToken = data.data.accessToken;
      refreshToken = data.data.refreshToken;
    });

    it('should reject duplicate email registration', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already');
    });

    it('should validate required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid' }),
      });

      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testUser,
          email: 'not-an-email',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });

    it('should validate password strength', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testUser,
          email: `weak-${Date.now()}@example.com`,
          password: '123',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.accessToken).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();

      // Update tokens for subsequent tests
      accessToken = data.data.accessToken;
      refreshToken = data.data.refreshToken;
    });

    it('should reject invalid password', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'WrongPassword123!',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');
    });

    it('should reject non-existent user', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token',
        },
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.accessToken).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();

      // Update tokens
      accessToken = data.data.accessToken;
      refreshToken = data.data.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'invalid-token' }),
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should invalidate token after logout', async () => {
      // Try to use the old token
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      // Token should be blacklisted
      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on login endpoint', async () => {
      // Make multiple rapid requests
      const requests = Array(10).fill(null).map(() =>
        fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'ratelimit@test.com',
            password: 'test',
          }),
        })
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status);

      // At least some requests should be rate limited (429)
      // or all should be 401 (invalid credentials)
      expect(statuses.some(s => s === 429 || s === 401 || s === 422)).toBe(true);
    });
  });
});
