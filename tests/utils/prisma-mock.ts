import { vi } from 'vitest';

// Create a deep mock of Prisma client
function createPrismaMock() {
  return new Proxy({} as any, {
    get: (_target, model: string) => {
      if (model === '$transaction') {
        return vi.fn().mockImplementation(async (fn: Function) => {
          const txMock = createPrismaMock();
          return fn(txMock);
        });
      }
      if (model === '$queryRaw') return vi.fn();
      if (model === '$executeRaw') return vi.fn();

      return new Proxy({} as any, {
        get: (_t, method: string) => {
          const fn = vi.fn();
          // Default behaviors for common operations
          if (method === 'findMany') fn.mockResolvedValue([]);
          if (method === 'findFirst') fn.mockResolvedValue(null);
          if (method === 'findUnique') fn.mockResolvedValue(null);
          if (method === 'count') fn.mockResolvedValue(0);
          if (method === 'aggregate') fn.mockResolvedValue({ _sum: {}, _count: 0 });
          return fn;
        },
      });
    },
  });
}

export const prismaMock = createPrismaMock();

// Helper to mock the db module
export function mockDb() {
  vi.mock('@/lib/db', () => ({
    db: prismaMock,
  }));
}

// Helper to set up mock return values for a model
export function mockModelReturn(model: string, method: string, value: any) {
  prismaMock[model][method].mockResolvedValue(value);
}

// Helper to reset all mocks between tests
export function resetPrismaMocks() {
  Object.keys(prismaMock).forEach((key) => {
    if (typeof prismaMock[key] === 'object' && prismaMock[key] !== null) {
      Object.keys(prismaMock[key]).forEach((method) => {
        if (vi.isMockFunction(prismaMock[key][method])) {
          prismaMock[key][method].mockReset();
          // Restore defaults
          if (method === 'findMany') prismaMock[key][method].mockResolvedValue([]);
          if (method === 'findFirst') prismaMock[key][method].mockResolvedValue(null);
          if (method === 'findUnique') prismaMock[key][method].mockResolvedValue(null);
          if (method === 'count') prismaMock[key][method].mockResolvedValue(0);
        }
      });
    } else if (vi.isMockFunction(prismaMock[key])) {
      prismaMock[key].mockReset();
    }
  });
}
