import { setupTestDb, teardownTestDb, type TestDb } from './testcontainers';

let testDb: TestDb | null = null;

export async function setup() {
  try {
    testDb = await setupTestDb();
    // Store the connection info for test files to access
    process.env.TEST_DB_URI = testDb.connectionString;
    process.env.DATABASE_URL = testDb.connectionString;
    console.log(`[testcontainers] PostgreSQL ready at ${testDb.connectionString}`);
  } catch (error) {
    console.error('[testcontainers] Failed to start PostgreSQL container:', error);
    console.error('[testcontainers] Integration tests will be skipped.');
    process.env.TEST_DB_AVAILABLE = 'false';
  }
}

export async function teardown() {
  if (testDb) {
    await teardownTestDb();
    console.log('[testcontainers] PostgreSQL container stopped.');
  }
}
