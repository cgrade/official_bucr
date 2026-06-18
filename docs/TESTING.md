# Bucr Testing Documentation

## Overview

This document describes the comprehensive testing strategy for the Bucr API, covering unit tests, integration tests, end-to-end workflow tests, and load/battle testing.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup and database connection
├── utils/
│   └── test-helpers.ts         # Test utilities, factories, and mocks
├── unit/                       # Unit tests
│   ├── auth/
│   │   ├── jwt.test.ts         # JWT token signing/verification
│   │   └── password.test.ts    # Password hashing/verification
│   ├── services/
│   │   ├── credit.service.test.ts      # Credit system logic
│   │   └── reservation.service.test.ts # Reservation workflows
│   └── utils/
│       └── helpers.test.ts     # Utility function tests
├── integration/                # API endpoint integration tests
│   ├── auth/
│   │   └── auth.test.ts        # Auth endpoints (register, login, refresh)
│   ├── users/
│   │   └── users.test.ts       # User endpoints (profile, credits, favorites)
│   ├── vendors/
│   │   └── vendors.test.ts     # Vendor endpoints (discovery, portal)
│   ├── reservations/
│   │   └── reservations.test.ts # Reservation endpoints
│   ├── orders/
│   │   └── orders.test.ts      # Order endpoints
│   └── admin/
│       └── admin.test.ts       # Admin dashboard and management
├── e2e/
│   └── workflows.test.ts       # End-to-end user journey tests
└── load/
    ├── artillery.yml           # Load testing configuration
    └── stress-test.yml         # Stress testing configuration
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### With Coverage Report
```bash
npm run test:coverage
```

### Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E workflow tests
npm run test:e2e

# CI mode (sequential, with coverage)
npm run test:ci
```

## Load Testing

### Standard Load Test
```bash
npm run test:load
```

This runs a multi-phase load test:
1. **Warm-up** (30s): 5 requests/sec
2. **Ramp-up** (60s): 5 → 50 requests/sec
3. **Sustained** (120s): 50 requests/sec
4. **Spike** (30s): 100 requests/sec
5. **Cool-down** (30s): 10 requests/sec

### Stress Test
```bash
npm run test:stress
```

Pushes the system to breaking point:
- Phase 1: 100 requests/sec
- Phase 2: 200 requests/sec
- Phase 3: 300 requests/sec (peak)
- Recovery: 100 requests/sec

### Generate Load Test Report
```bash
npm run test:load:report
```

## Test Categories

### Unit Tests

Test individual functions and modules in isolation:

| Module | Coverage |
|--------|----------|
| JWT Authentication | Token signing, verification, extraction |
| Password Utilities | Hashing, verification, security properties |
| Credit Service | Purchase, deduction, refund, bonus, forfeit, calculations |
| Reservation Service | Create, check-in, cancel, modify, no-show |
| Helper Functions | Slug generation, references, currency formatting |

### Integration Tests

Test API endpoints with real database:

| Endpoint Group | Tests |
|----------------|-------|
| Auth | Register, login, refresh, vendor/admin auth |
| Users | Profile CRUD, credits, favorites, reservations, orders |
| Vendors | Discovery, details, portal, branches, menu, gallery |
| Reservations | Create, modify, cancel, check-in, no-show |
| Orders | Create, confirm payment, status updates, cancel |
| Admin | Dashboard, user/vendor management, document verification |

### E2E Workflow Tests

Complete user journeys:

1. **User Reservation Journey**
   - Register → Purchase credits → Browse vendors → Add favorite → Create reservation → Vendor check-in → Leave review

2. **Order Journey**
   - Create order → Confirm payment → Status updates → Complete → Review

3. **Vendor Onboarding Journey**
   - Register → Upload documents → Admin verification → Setup menu/gallery → Go live

## Test Utilities

### Test Helpers (`tests/utils/test-helpers.ts`)

```typescript
// Create test user
const user = await createTestUser({ email: 'test@example.com' });

// Create test vendor with owner and branch
const { vendor, owner, branch } = await createTestVendor();

// Create test admin
const admin = await createTestAdmin();

// Generate auth tokens
const { accessToken, refreshToken } = await generateTestTokens(userId, 'user', email);

// Create mock request
const request = createMockRequest('POST', '/api/endpoint', {
  body: { ... },
  headers: { Authorization: `Bearer ${token}` },
  searchParams: { page: '1' },
});

// Parse response
const data = await parseResponse(response);

// Cleanup
await cleanupTestData();
```

## Coverage Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

## Writing New Tests

### Unit Test Template
```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('MyService', () => {
  beforeEach(() => {
    // Setup
  });

  describe('myFunction', () => {
    it('should do something', () => {
      const result = myFunction(input);
      expect(result).toBe(expectedOutput);
    });

    it('should handle edge case', () => {
      expect(() => myFunction(null)).toThrow();
    });
  });
});
```

### Integration Test Template
```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestUser, cleanupTestData, createMockRequest, parseResponse } from '../utils/test-helpers';

describe('My API Endpoint', () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('should return 200 for valid request', async () => {
    const request = createMockRequest('GET', '/api/endpoint', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const response = await handler(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data after tests
3. **Realistic Data**: Use realistic test data
4. **Edge Cases**: Test error conditions and edge cases
5. **Performance**: Keep tests fast by minimizing database operations
6. **Documentation**: Add comments explaining complex test scenarios

## CI/CD Integration

For CI environments, use:
```bash
npm run test:ci
```

This runs tests:
- Sequentially (--runInBand) for database consistency
- With coverage report
- In CI mode for better output formatting

## Troubleshooting

### Database Connection Issues
Ensure PostgreSQL is running:
```bash
docker compose up -d
```

### Test Timeouts
Increase timeout in jest.config.js:
```javascript
testTimeout: 30000
```

### Flaky Tests
- Use `--runInBand` to run tests sequentially
- Check for race conditions in async operations
- Ensure proper cleanup between tests
