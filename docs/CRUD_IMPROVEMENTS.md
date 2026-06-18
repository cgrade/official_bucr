# CRUD Operations Improvement Plan

## Phase 1: Critical Fixes (Week 1)

### 1. Add Global Error Handling
```typescript
// src/lib/middleware/error-handler.ts
export function withErrorHandler(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      console.error('API Error:', error);
      return errorResponse('Internal server error', 500);
    }
  };
}
```

### 2. Input Validation Schemas
```typescript
// src/lib/validators/common.ts
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
  filters: z.record(z.string()).optional(),
});
```

### 3. Rate Limiting
```typescript
// src/lib/middleware/rate-limit.ts
import { RateLimiter } from '@/lib/utils/rate-limiter';

const limiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

export async function rateLimit(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  return limiter.check(ip);
}
```

## Phase 2: Database Optimization (Week 2)

### 1. Add Missing Indexes
```sql
-- High-priority indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_vendors_slug ON vendors(slug);
CREATE INDEX idx_reservations_user_id_status ON reservations(user_id, status);
CREATE INDEX idx_orders_vendor_id_status ON takeout_orders(vendor_id, status);
CREATE INDEX idx_reviews_vendor_id_rating ON reviews(vendor_id, rating);
```

### 2. Query Optimization
```typescript
// Before: Over-fetching
const vendor = await db.vendor.findUnique({
  where: { id },
  include: { 
    branches: true,
    menu: true,
    reviews: true,
    // ... everything
  }
});

// After: Select only needed fields
const vendor = await db.vendor.findUnique({
  where: { id },
  select: {
    id: true,
    businessName: true,
    slug: true,
    branches: {
      select: { id: true, name: true, address: true },
      where: { isActive: true }
    }
  }
});
```

## Phase 3: API Standardization (Week 3)

### 1. Consistent CRUD Pattern
```typescript
// src/lib/crud/base-handler.ts
export abstract class CRUDHandler<T> {
  abstract model: any;
  abstract validator: any;
  
  async list(req: NextRequest) {
    const { page, limit } = paginationSchema.parse(req.nextUrl.searchParams);
    const [items, total] = await Promise.all([
      this.model.findMany({ skip: (page - 1) * limit, take: limit }),
      this.model.count()
    ]);
    
    return successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  }
  
  async create(req: NextRequest) {
    const data = this.validator.parse(await req.json());
    const item = await this.model.create({ data });
    return createdResponse(item);
  }
  
  async update(req: NextRequest, id: string) {
    const data = this.validator.parse(await req.json());
    const item = await this.model.update({ where: { id }, data });
    return successResponse(item);
  }
  
  async delete(req: NextRequest, id: string) {
    await this.model.update({ 
      where: { id }, 
      data: { deletedAt: new Date() } 
    });
    return successResponse(null, 'Deleted successfully');
  }
}
```

### 2. API Versioning
```
/api/v1/users
/api/v1/vendors
/api/v1/admin/*
```

## Phase 4: Testing & Documentation (Week 4)

### 1. API Tests
```typescript
// __tests__/api/users.test.ts
describe('Users API', () => {
  it('should list users with pagination', async () => {
    const res = await GET('/api/users?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
  });
  
  it('should validate input on create', async () => {
    const res = await POST('/api/users', { invalid: 'data' });
    expect(res.status).toBe(422);
  });
});
```

### 2. OpenAPI Documentation
```yaml
openapi: 3.0.0
info:
  title: BUCR API
  version: 1.0.0
paths:
  /api/users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
```

## Phase 5: Performance & Monitoring (Month 2)

### 1. Caching Strategy
- Redis for session management
- CDN for static assets
- Query result caching

### 2. Monitoring
- APM with Sentry
- Database query monitoring
- API response time tracking

### 3. Audit Logging
```typescript
// src/lib/audit/logger.ts
export async function logAdminAction(
  adminId: string,
  action: string,
  resource: string,
  resourceId: string,
  changes?: any
) {
  await db.auditLog.create({
    data: {
      adminId,
      action,
      resource,
      resourceId,
      changes: JSON.stringify(changes),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }
  });
}
```

## Implementation Priority

1. **Critical** (Week 1)
   - [ ] Global error handling
   - [ ] Input validation
   - [ ] Rate limiting
   - [ ] Fix missing CRUD endpoints

2. **High** (Week 2)
   - [ ] Database indexes
   - [ ] Query optimization
   - [ ] API standardization
   - [ ] Security headers

3. **Medium** (Week 3-4)
   - [ ] Testing suite
   - [ ] API documentation
   - [ ] Caching layer
   - [ ] Monitoring

4. **Low** (Month 2+)
   - [ ] GraphQL alternative
   - [ ] WebSocket support
   - [ ] Microservices migration

## Success Metrics

- API response time < 200ms (p95)
- Zero unhandled errors in production
- 100% input validation coverage
- 80%+ test coverage
- Zero critical security vulnerabilities
