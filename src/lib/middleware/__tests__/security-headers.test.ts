import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  securityHeaders,
  withSecurityHeaders,
  corsHeaders,
  getCorsOptions,
  handleCorsPreflightRequest,
  withCors,
} from '../security-headers';

describe('Security Headers Middleware', () => {
  describe('securityHeaders', () => {
    it('should include X-Content-Type-Options header', () => {
      expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should include X-Frame-Options header', () => {
      expect(securityHeaders['X-Frame-Options']).toBe('DENY');
    });

    it('should include X-XSS-Protection header', () => {
      expect(securityHeaders['X-XSS-Protection']).toBe('1; mode=block');
    });

    it('should include Referrer-Policy header', () => {
      expect(securityHeaders['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should include Content-Security-Policy header', () => {
      expect(securityHeaders['Content-Security-Policy']).toBeDefined();
      expect(securityHeaders['Content-Security-Policy']).toContain("default-src 'self'");
    });

    it('should include Strict-Transport-Security header', () => {
      expect(securityHeaders['Strict-Transport-Security']).toBeDefined();
      expect(securityHeaders['Strict-Transport-Security']).toContain('max-age=');
    });

    it('should include Permissions-Policy header', () => {
      expect(securityHeaders['Permissions-Policy']).toBeDefined();
    });
  });

  describe('withSecurityHeaders', () => {
    it('should add security headers to response', async () => {
      // Create a response with mutable headers
      const mockHeaders = new Headers();
      const mockResponse = {
        headers: mockHeaders,
        status: 200,
        body: JSON.stringify({ success: true }),
        json: async () => ({ success: true }),
      } as unknown as NextResponse;
      
      const handler = async () => mockResponse;
      const wrapped = withSecurityHeaders(handler);

      const request = new NextRequest('http://localhost:3000/api/test');
      const response = await wrapped(request);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('should preserve original response status', async () => {
      const mockHeaders = new Headers();
      const mockResponse = {
        headers: mockHeaders,
        status: 404,
        body: JSON.stringify({ error: 'Not found' }),
        json: async () => ({ error: 'Not found' }),
      } as unknown as NextResponse;
      
      const handler = async () => mockResponse;
      const wrapped = withSecurityHeaders(handler);

      const request = new NextRequest('http://localhost:3000/api/test');
      const response = await wrapped(request);

      expect(response.status).toBe(404);
    });

    it('should preserve original response body', async () => {
      const mockHeaders = new Headers();
      const mockResponse = {
        headers: mockHeaders,
        status: 200,
        body: JSON.stringify({ data: 'test' }),
        json: async () => ({ data: 'test' }),
      } as unknown as NextResponse;
      
      const handler = async () => mockResponse;
      const wrapped = withSecurityHeaders(handler);

      const request = new NextRequest('http://localhost:3000/api/test');
      const response = await wrapped(request);
      const body = await response.json();

      expect(body.data).toBe('test');
    });
  });

  describe('corsHeaders', () => {
    it('should include Access-Control-Allow-Origin', () => {
      const headers = corsHeaders('http://localhost:3001');
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3001');
    });

    it('should include Access-Control-Allow-Methods', () => {
      const headers = corsHeaders('*');
      expect(headers['Access-Control-Allow-Methods']).toContain('GET');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
      expect(headers['Access-Control-Allow-Methods']).toContain('PUT');
      expect(headers['Access-Control-Allow-Methods']).toContain('DELETE');
    });

    it('should include Access-Control-Allow-Headers', () => {
      const headers = corsHeaders('*');
      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
      expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
    });

    it('should include Access-Control-Allow-Credentials', () => {
      const headers = corsHeaders('*', { credentials: true });
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('should include Access-Control-Max-Age', () => {
      const headers = corsHeaders('*', { maxAge: 3600 });
      expect(headers['Access-Control-Max-Age']).toBe('3600');
    });
  });

  describe('getCorsOptions', () => {
    it('should return allowed origins from config', () => {
      const options = getCorsOptions();
      expect(options.allowedOrigins).toBeDefined();
      expect(Array.isArray(options.allowedOrigins)).toBe(true);
    });

    it('should validate origin against allowed list', () => {
      const options = getCorsOptions();
      const isAllowed = options.isOriginAllowed('http://localhost:3000');
      expect(typeof isAllowed).toBe('boolean');
    });
  });

  describe('handleCorsPreflightRequest', () => {
    it('should return null for non-OPTIONS requests', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });
      const result = handleCorsPreflightRequest(request);
      expect(result).toBeNull();
    });
  });
});
