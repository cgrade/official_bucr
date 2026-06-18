import { vi } from 'vitest';

// Setup test environment
(process.env as any).NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
