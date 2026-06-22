import { vi } from 'vitest';

(process.env as any).NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/bucr_test?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-nextauth-secret';
process.env.RATE_LIMIT_DISABLED = 'true'; // in-process route handlers skip rate limiting under test
