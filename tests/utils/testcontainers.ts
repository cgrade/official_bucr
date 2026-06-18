import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let container: StartedTestContainer | null = null;
let prisma: PrismaClient | null = null;
let connectionString: string | null = null;

export interface TestDb {
  prisma: PrismaClient;
  connectionString: string;
  container: StartedTestContainer;
}

/**
 * Start a PostgreSQL testcontainer, run migrations, and return a connected PrismaClient.
 * Call this once in a global setup file or beforeAll at the root describe level.
 */
export async function setupTestDb(): Promise<TestDb> {
  if (container && prisma && connectionString) {
    return { prisma, connectionString, container };
  }

  // Start Postgres container using GenericContainer
  container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'bucr_test',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
    .start();

  const port = container.getMappedPort(5432);
  const host = container.getHost();
  connectionString = `postgresql://test:test@${host}:${port}/bucr_test`;
  process.env.DATABASE_URL = connectionString;

  // Run Prisma migrations against the test container
  execSync(`npx prisma migrate deploy`, {
    env: {
      ...process.env,
      DATABASE_URL: connectionString,
    },
    stdio: 'pipe',
  });

  // Create PrismaClient connected to the test container
  prisma = new PrismaClient({
    datasources: {
      db: { url: connectionString },
    },
    log: ['error'],
  });

  return { prisma, connectionString, container };
}

/**
 * Stop the testcontainer and disconnect Prisma.
 * Call this once in globalTeardown or afterAll at the root describe level.
 */
export async function teardownTestDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  if (container) {
    await container.stop();
    container = null;
  }
}

/**
 * Clean all data from the test database, preserving the schema.
 * Call this between test suites to ensure isolation.
 */
export async function cleanTestDb(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;

  // Delete in order respecting FK constraints
  // We truncate with CASCADE to handle all FK relationships
  for (const { tablename } of tables) {
    if (tablename === '_prisma_migrations') continue;
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
  }
}

/**
 * Get the existing test DB connection if already set up, or throw.
 */
export function getTestDb(): TestDb {
  if (!container || !prisma || !connectionString) {
    throw new Error('Test DB not initialized. Call setupTestDb() first.');
  }
  return { prisma, connectionString, container };
}

/**
 * Override the `@/lib/db` module to use the testcontainer PrismaClient.
 * This ensures all service code uses the real test DB instead of the production DB.
 */
export function getDbOverride(prisma: PrismaClient) {
  return { db: prisma };
}
