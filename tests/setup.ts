import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test timeout
jest.setTimeout(30000);

// Clean up database before all tests
beforeAll(async () => {
  // Ensure test database is clean
  try {
    await prisma.$connect();
    console.log('✓ Database connected for tests');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  await prisma.$disconnect();
  console.log('✓ Database disconnected after tests');
});

// Declare custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

export { prisma };
