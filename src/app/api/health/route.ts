import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const start = Date.now();

  let dbStatus = 'ok';
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  return Response.json({
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    responseTimeMs: Date.now() - start,
    services: {
      database: dbStatus,
    },
  }, { status: dbStatus === 'ok' ? 200 : 503 });
}
