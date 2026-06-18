import { describe, it, expect } from 'vitest';
import {
  successResponse,
  errorResponse,
  createdResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '../api-response';

describe('API Response Utilities', () => {
  describe('successResponse', () => {
    it('should return 200 status by default', async () => {
      const response = successResponse({ id: 1 });
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: 1 });
    });

    it('should include message when provided', async () => {
      const response = successResponse({ id: 1 }, 'Success message');
      const body = await response.json();
      expect(body.message).toBe('Success message');
    });

    it('should include meta when provided', async () => {
      const response = successResponse({ id: 1 }, undefined, { page: 1, total: 10 });
      const body = await response.json();
      expect(body.meta).toEqual({ page: 1, total: 10 });
    });

    it('should use custom status when provided', async () => {
      const response = successResponse({ id: 1 }, undefined, undefined, 202);
      expect(response.status).toBe(202);
    });
  });

  describe('errorResponse', () => {
    it('should return 400 status by default', async () => {
      const response = errorResponse('Bad request');
      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Bad request');
    });

    it('should use custom status when provided', async () => {
      const response = errorResponse('Server error', 500);
      expect(response.status).toBe(500);
    });
  });

  describe('createdResponse', () => {
    it('should return 201 status', async () => {
      const response = createdResponse({ id: 1 });
      expect(response.status).toBe(201);
      
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('should include message when provided', async () => {
      const response = createdResponse({ id: 1 }, 'Resource created');
      const body = await response.json();
      expect(body.message).toBe('Resource created');
    });
  });

  describe('notFoundResponse', () => {
    it('should return 404 status', async () => {
      const response = notFoundResponse();
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.error).toBe('Resource not found');
    });

    it('should use custom resource name', async () => {
      const response = notFoundResponse('User');
      const body = await response.json();
      expect(body.error).toBe('User not found');
    });
  });

  describe('unauthorizedResponse', () => {
    it('should return 401 status', async () => {
      const response = unauthorizedResponse();
      expect(response.status).toBe(401);
      
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should use custom message', async () => {
      const response = unauthorizedResponse('Invalid token');
      const body = await response.json();
      expect(body.error).toBe('Invalid token');
    });
  });

  describe('forbiddenResponse', () => {
    it('should return 403 status', async () => {
      const response = forbiddenResponse();
      expect(response.status).toBe(403);
      
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
    });

    it('should use custom message', async () => {
      const response = forbiddenResponse('Access denied');
      const body = await response.json();
      expect(body.error).toBe('Access denied');
    });
  });

  describe('validationErrorResponse', () => {
    it('should return 422 status', async () => {
      const response = validationErrorResponse('Invalid email');
      expect(response.status).toBe(422);
      
      const body = await response.json();
      expect(body.error).toBe('Invalid email');
    });

    it('should join array of errors', async () => {
      const response = validationErrorResponse(['Invalid email', 'Name required']);
      const body = await response.json();
      expect(body.error).toBe('Invalid email, Name required');
    });
  });

  describe('serverErrorResponse', () => {
    it('should return 500 status', async () => {
      const response = serverErrorResponse();
      expect(response.status).toBe(500);
      
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });

    it('should use custom message', async () => {
      const response = serverErrorResponse('Database connection failed');
      const body = await response.json();
      expect(body.error).toBe('Database connection failed');
    });
  });
});
