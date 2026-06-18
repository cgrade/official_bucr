import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers applied to all responses
 */
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
};

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
].filter(Boolean);

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.startsWith('http://192.168.') ||
    origin.startsWith('http://10.')
  );
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isPreflight = request.method === 'OPTIONS';

  // Handle CORS preflight
  if (isPreflight) {
    const response = new NextResponse(null, { status: 204 });

    if (origin && isOriginAllowed(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With'
      );
      response.headers.set('Access-Control-Max-Age', '86400');
    }

    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  // Continue with request
  const response = NextResponse.next();

  // Add CORS headers for allowed origins
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
};
