import { db } from '@/lib/db';

let _dbAvailable: boolean | null = null;

export async function isDbAvailable(): Promise<boolean> {
  if (_dbAvailable !== null) return _dbAvailable;
  try {
    await db.$queryRaw`SELECT 1`;
    _dbAvailable = true;
  } catch {
    _dbAvailable = false;
  }
  return _dbAvailable;
}
