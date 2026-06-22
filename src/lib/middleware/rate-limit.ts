import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  message?: string;      // Custom error message
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default configurations for different endpoint types
export const rateLimitConfigs = {
  // Strict limits for auth endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts. Please try again later.',
  },
  // Password reset - very strict
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts. Please try again later.',
  },
  // Verification endpoints
  verification: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    message: 'Too many verification attempts. Please try again later.',
  },
  // Standard API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    message: 'Too many requests. Please slow down.',
  },
  // Strict for payment endpoints
  payment: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many payment requests. Please slow down.',
  },
  // Webhook endpoints (higher limit)
  webhook: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Rate limit exceeded.',
  },
} as const;

/**
 * Get client identifier from request
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  
  // Use the first available IP
  const ip = cfIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown';
  
  // Include path in key for per-endpoint limiting
  const path = new URL(request.url).pathname;
  
  return `${ip}:${path}`;
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  // Explicit opt-out for automated test runs only (never set in production).
  if (process.env.RATE_LIMIT_DISABLED === 'true') {
    return { allowed: true, remaining: config.maxRequests, resetAt: Date.now() + config.windowMs };
  }
  const key = getClientIdentifier(request);
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // Clean up or create new entry if expired
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const allowed = entry.count <= config.maxRequests;
  
  return { allowed, remaining, resetAt: entry.resetAt };
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<Response>,
  config: RateLimitConfig = rateLimitConfigs.api
) {
  return async (request: NextRequest): Promise<Response> => {
    const { allowed, remaining, resetAt } = checkRateLimit(request, config);
    
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: config.message || 'Too many requests',
          error: 'RATE_LIMIT_EXCEEDED',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
            'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }
    
    const response = await handler(request);
    
    // Add rate limit headers to response
    const newResponse = new NextResponse(response.body, response);
    newResponse.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    newResponse.headers.set('X-RateLimit-Remaining', remaining.toString());
    newResponse.headers.set('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());
    
    return newResponse;
  };
}

/**
 * Apply rate limit and return response if exceeded
 * Use this for inline rate limiting in route handlers
 */
export function applyRateLimit(
  request: NextRequest,
  configType: keyof typeof rateLimitConfigs = 'api'
): NextResponse | null {
  const config = rateLimitConfigs[configType];
  const { allowed, remaining, resetAt } = checkRateLimit(request, config);
  
  if (!allowed) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: config.message,
        error: 'RATE_LIMIT_EXCEEDED',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
          'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }
  
  return null; // Allowed
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimitStore(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  return cleaned;
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupRateLimitStore();
  }, 5 * 60 * 1000);
}
