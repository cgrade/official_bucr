import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers for all API responses
 */
export const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
  ].join('; '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=(self)',
    'payment=(self)',
  ].join(', '),
};

type RouteHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse;

/**
 * Middleware wrapper that adds security headers to responses
 */
export function withSecurityHeaders(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: any) => {
    const response = await handler(request, context);

    // Add security headers directly to the response
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

interface CorsOptions {
  credentials?: boolean;
  maxAge?: number;
  methods?: string[];
  headers?: string[];
}

/**
 * Generate CORS headers for a specific origin
 */
export function corsHeaders(
  origin: string,
  options: CorsOptions = {}
): Record<string, string> {
  const {
    credentials = false,
    maxAge = 86400,
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization', 'X-Requested-With'],
  } = options;

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Allow-Headers': headers.join(', '),
    'Access-Control-Max-Age': String(maxAge),
  };

  if (credentials) {
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  }

  return corsHeaders;
}

/**
 * Allowed origins for CORS
 */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:8084',
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.ADMIN_PORTAL_URL,
  process.env.VENDOR_PORTAL_URL,
].filter(Boolean) as string[];

/**
 * Get CORS configuration options
 */
export function getCorsOptions() {
  return {
    allowedOrigins: ALLOWED_ORIGINS,
    isOriginAllowed: (origin: string): boolean => {
      if (!origin) return false;
      return ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://192.168.');
    },
  };
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(
  request: NextRequest
): NextResponse | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  const origin = request.headers.get('origin') || '*';
  const { isOriginAllowed } = getCorsOptions();

  if (!isOriginAllowed(origin) && origin !== '*') {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin, { credentials: true }),
      ...securityHeaders,
    },
  });
}

/**
 * Middleware wrapper that adds CORS headers to responses
 */
export function withCors(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: any) => {
    // Handle preflight
    const preflightResponse = handleCorsPreflightRequest(request);
    if (preflightResponse) {
      return preflightResponse;
    }

    const response = await handler(request, context);
    const origin = request.headers.get('origin') || '*';
    const { isOriginAllowed } = getCorsOptions();

    // Clone response to add headers
    const newResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // Add CORS headers if origin is allowed
    if (isOriginAllowed(origin) || origin === '*') {
      Object.entries(corsHeaders(origin, { credentials: true })).forEach(
        ([key, value]) => {
          newResponse.headers.set(key, value);
        }
      );
    }

    return newResponse;
  };
}
