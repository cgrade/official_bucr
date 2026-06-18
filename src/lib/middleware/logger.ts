import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

interface RequestLog {
  timestamp: string;
  requestId: string;
  method: string;
  url: string;
  query?: Record<string, string>;
  ip?: string;
  userAgent?: string;
}

interface ResponseLog extends RequestLog {
  status: number;
  duration: string;
}

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];

/**
 * Create a request log entry
 */
export function createRequestLog(request: NextRequest): RequestLog {
  const url = new URL(request.url);
  const query: Record<string, string> = {};
  
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  return {
    timestamp: new Date().toISOString(),
    requestId: randomUUID(),
    method: request.method,
    url: url.pathname,
    query: Object.keys(query).length > 0 ? query : undefined,
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        'unknown',
    userAgent: request.headers.get('user-agent') || undefined,
  };
}

/**
 * Format duration for logging
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Sanitize headers by redacting sensitive values
 */
export function sanitizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  
  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.includes(lowerKey)) {
      result[lowerKey] = '[REDACTED]';
    } else {
      result[lowerKey] = value;
    }
  });

  return result;
}

/**
 * Format log line for console output
 */
function formatLogLine(log: ResponseLog): string {
  const statusColor = log.status >= 400 ? '\x1b[31m' : '\x1b[32m';
  const reset = '\x1b[0m';
  
  return `${log.timestamp} | ${log.method.padEnd(6)} ${log.url} | ${statusColor}${log.status}${reset} | ${log.duration}`;
}

type RouteHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse;

/**
 * Middleware wrapper that logs requests and responses
 */
export function withRequestLogging(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: any) => {
    const startTime = Date.now();
    const log = createRequestLog(request);

    try {
      const response = await handler(request, context);
      const duration = Date.now() - startTime;

      const responseLog: ResponseLog = {
        ...log,
        status: response.status,
        duration: formatDuration(duration),
      };

      // Log to console (in production, send to logging service)
      console.log(formatLogLine(responseLog));

      // In development, log more details for slow requests
      if (process.env.NODE_ENV === 'development' && duration > 1000) {
        console.log('Slow request details:', {
          ...responseLog,
          headers: sanitizeHeaders(request.headers),
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error(`${log.timestamp} | ${log.method.padEnd(6)} ${log.url} | ERROR | ${formatDuration(duration)}`, {
        requestId: log.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  };
}

/**
 * Structured logger for application events
 */
export const logger = {
  info: (message: string, data?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...data,
    }));
  },

  warn: (message: string, data?: Record<string, any>) => {
    console.warn(JSON.stringify({
      level: 'warn',
      timestamp: new Date().toISOString(),
      message,
      ...data,
    }));
  },

  error: (message: string, error?: Error, data?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      ...data,
    }));
  },

  debug: (message: string, data?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify({
        level: 'debug',
        timestamp: new Date().toISOString(),
        message,
        ...data,
      }));
    }
  },
};
