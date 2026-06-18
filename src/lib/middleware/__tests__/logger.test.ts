import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  createRequestLog,
  withRequestLogging,
  formatDuration,
  sanitizeHeaders,
} from '../logger';

describe('Logger Middleware', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('createRequestLog', () => {
    it('should create log entry with required fields', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const log = createRequestLog(request);

      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('method', 'GET');
      expect(log).toHaveProperty('url', '/api/test');
      expect(log).toHaveProperty('requestId');
    });

    it('should include query parameters', () => {
      const request = new NextRequest('http://localhost:3000/api/test?page=1&limit=10');
      const log = createRequestLog(request);

      expect(log.query).toEqual({ page: '1', limit: '10' });
    });

    it('should extract user agent when present', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      // Mock the headers.get method
      vi.spyOn(request.headers, 'get').mockImplementation((name: string) => {
        if (name === 'user-agent') return 'Test Browser/1.0';
        return null;
      });

      const log = createRequestLog(request);

      expect(log.userAgent).toBe('Test Browser/1.0');
    });

    it('should extract IP address when present', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      // Mock the headers.get method
      vi.spyOn(request.headers, 'get').mockImplementation((name: string) => {
        if (name === 'x-forwarded-for') return '192.168.1.1';
        return null;
      });

      const log = createRequestLog(request);

      expect(log.ip).toBe('192.168.1.1');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(50)).toBe('50ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1.00s');
      expect(formatDuration(2500)).toBe('2.50s');
    });
  });

  describe('sanitizeHeaders', () => {
    it('should remove sensitive headers', () => {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer secret-token',
        'Cookie': 'session=abc123',
        'X-Custom': 'value',
      });

      const sanitized = sanitizeHeaders(headers);

      expect(sanitized['content-type']).toBe('application/json');
      expect(sanitized['authorization']).toBe('[REDACTED]');
      expect(sanitized['cookie']).toBe('[REDACTED]');
      expect(sanitized['x-custom']).toBe('value');
    });
  });

  describe('withRequestLogging', () => {
    it('should log request and response', async () => {
      const handler = async () => NextResponse.json({ success: true });
      const wrapped = withRequestLogging(handler);

      const request = new NextRequest('http://localhost:3000/api/test');
      await wrapped(request);

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('GET');
      expect(logCall).toContain('/api/test');
    });

    it('should include response status in log', async () => {
      const handler = async () => NextResponse.json({ error: 'Not found' }, { status: 404 });
      const wrapped = withRequestLogging(handler);

      const request = new NextRequest('http://localhost:3000/api/test');
      await wrapped(request);

      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('404');
    });

    it('should include duration in log', async () => {
      const handler = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return NextResponse.json({ success: true });
      };
      const wrapped = withRequestLogging(handler);

      const request = new NextRequest('http://localhost:3000/api/test');
      await wrapped(request);

      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toMatch(/\d+ms/);
    });

    it('should not modify response', async () => {
      const handler = async () => NextResponse.json({ data: 'test' }, { status: 201 });
      const wrapped = withRequestLogging(handler);

      const request = new NextRequest('http://localhost:3000/api/test');
      const response = await wrapped(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data).toBe('test');
    });

    it('should log errors', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const handler = async () => {
        throw new Error('Test error');
      };
      const wrapped = withRequestLogging(handler);

      const request = new NextRequest('http://localhost:3000/api/test');
      
      await expect(wrapped(request)).rejects.toThrow('Test error');
      expect(errorSpy).toHaveBeenCalled();
      
      errorSpy.mockRestore();
    });
  });
});
