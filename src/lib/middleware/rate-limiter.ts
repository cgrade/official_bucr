import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/utils/api-response';

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
  message?: string;  // Custom error message
  skipPaths?: string[]; // Paths to skip rate limiting
  skipAuth?: boolean;   // Skip rate limiting for authenticated users
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory store (consider Redis for production)
const store = new Map<string, RateLimitStore>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.resetTime < now) {
      store.delete(key);
    }
  }
}, 60000); // Clean every minute

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later',
      skipPaths: [],
      skipAuth: false,
      ...config,
    };
  }

  async check(identifier: string): Promise<boolean> {
    // Explicit opt-out for automated test runs only (never set in production).
    if (process.env.RATE_LIMIT_DISABLED === 'true') {
      return true;
    }
    const now = Date.now();
    const record = store.get(identifier);

    // Handle max: 0 edge case (block all requests)
    if (this.config.max <= 0) {
      return false;
    }

    if (!record || record.resetTime < now) {
      // Create new record
      store.set(identifier, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return true;
    }

    if (record.count >= this.config.max) {
      return false;
    }

    // Increment counter
    record.count++;
    store.set(identifier, record);
    return true;
  }

  middleware() {
    return async (request: NextRequest) => {
      // Skip rate limiting for certain paths
      const pathname = new URL(request.url).pathname;
      if (this.config.skipPaths?.some(path => pathname.startsWith(path))) {
        return null;
      }

      // Get identifier (IP address or user ID)
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      
      const identifier = `rate-limit:${ip}:${pathname}`;

      // Check rate limit
      const allowed = await this.check(identifier);
      if (!allowed) {
        return errorResponse(this.config.message || 'Too many requests', 429);
      }

      return null;
    };
  }
}

// Default rate limiters for different endpoints
export const apiLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
});

export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 auth attempts per 15 minutes
  message: 'Too many authentication attempts',
});

export const uploadLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: 'Upload limit exceeded',
});

export const creditPurchaseLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 purchases per hour
  message: 'Too many purchase attempts',
});

// Middleware wrapper for API routes
export function withRateLimit(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  limiter: RateLimiter = apiLimiter
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const limitResponse = await limiter.middleware()(request);
    if (limitResponse) {
      return limitResponse;
    }
    return handler(request, ...args);
  };
}
