import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { withErrorHandler } from '../error-handler';

describe('Error Handler Middleware', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should handle successful responses', async () => {
    const handler = withErrorHandler(async () => {
      return NextResponse.json({ success: true });
    });

    const request = new NextRequest('http://localhost:3000/api/test');
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle ZodError validation errors', async () => {
    const handler = withErrorHandler(async () => {
      throw new ZodError([
        {
          path: ['email'],
          message: 'Invalid email',
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
        },
      ]);
    });

    const request = new NextRequest('http://localhost:3000/api/test');
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.error).toContain('email: Invalid email');
  });

  it('should handle Prisma unique constraint error', async () => {
    const handler = withErrorHandler(async () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '4.0.0' }
      );
      throw error;
    });

    const request = new NextRequest('http://localhost:3000/api/test');
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('A record with this value already exists');
  });

  it('should handle Prisma record not found error', async () => {
    const handler = withErrorHandler(async () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '4.0.0' }
      );
      throw error;
    });

    const request = new NextRequest('http://localhost:3000/api/test');
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Record not found');
  });

  it('should handle custom Unauthorized errors', async () => {
    const handler = withErrorHandler(async () => {
      throw new Error('Unauthorized access');
    });

    const request = new NextRequest('http://localhost:3000/api/test');
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized access');
  });

  it('should handle unknown errors as 500', async () => {
    const handler = withErrorHandler(async () => {
      throw new Error('Something went wrong');
    });

    const request = new NextRequest('http://localhost:3000/api/test');
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('An unexpected error occurred');
  });

  it('should log errors to console', async () => {
    const handler = withErrorHandler(async () => {
      throw new Error('Test error');
    });

    const request = new NextRequest('http://localhost:3000/api/test');
    await handler(request);

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'API Error:',
      expect.objectContaining({
        url: 'http://localhost:3000/api/test',
        method: 'GET',
        error: expect.any(Error),
      })
    );
  });
});
