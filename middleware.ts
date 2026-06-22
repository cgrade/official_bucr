import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware is intentionally minimal: it ONLY answers CORS preflight.
 *
 * Security headers and CORS headers for normal responses are set in
 * next.config.js `headers()` — the reliable mechanism. Header mutations on
 * `NextResponse.next()` here do NOT propagate onto App Router Route Handler
 * responses, so doing it in middleware was dead code.
 *
 * Preflight still needs middleware: an unhandled OPTIONS on a route that only
 * exports GET/POST returns 405, which fails the browser preflight (it requires
 * a 2xx). next.config can't change that status, so we short-circuit OPTIONS
 * here with a 204 carrying the CORS + security headers.
 *
 * Auth is Bearer-token only (no cookies), so a wildcard origin without
 * credentials is correct and safe.
 */
const preflightHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
};

export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    for (const [key, value] of Object.entries(preflightHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // All other methods: headers come from next.config.js headers().
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
