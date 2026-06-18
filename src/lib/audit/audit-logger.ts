import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'approve' 
  | 'reject' 
  | 'suspend' 
  | 'restore' 
  | 'adjust_credits' 
  | 'verify' 
  | 'export';

export interface AuditLogEntry {
  adminId?: string;
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Extract IP address from request
 */
function getIpAddress(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Extract user agent from request
 */
function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Log an admin action for audit trail
 */
export async function logAdminAction(
  request: NextRequest,
  entry: Omit<AuditLogEntry, 'ipAddress' | 'userAgent'>
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        adminId: entry.adminId,
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        changes: (entry.changes || null) as any,
        metadata: (entry.metadata || null) as any,
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      },
    });
  } catch (error) {
    // Log but don't throw - audit logging should not break the main flow
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Calculate changes between old and new objects
 */
export function calculateChanges<T extends Record<string, unknown>>(
  oldObj: T,
  newObj: Partial<T>,
  trackedFields?: (keyof T)[]
): Record<string, { from: unknown; to: unknown }> | undefined {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const fieldsToCheck = trackedFields || (Object.keys(newObj) as (keyof T)[]);

  for (const key of fieldsToCheck) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key as string] = { from: oldVal, to: newVal };
    }
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}

/**
 * Middleware wrapper that automatically logs actions
 */
export function withAuditLog(
  handler: (request: NextRequest, ...args: any[]) => Promise<Response>,
  options: {
    action: AuditAction;
    resource: string;
    getResourceId?: (request: NextRequest, response: any) => string | undefined;
    getAdminId?: (request: NextRequest) => string | undefined;
    getUserId?: (request: NextRequest) => string | undefined;
  }
) {
  return async (request: NextRequest, ...args: any[]): Promise<Response> => {
    const response = await handler(request, ...args);

    // Only log successful mutations
    if (response.ok && ['create', 'update', 'delete', 'approve', 'reject', 'suspend', 'restore', 'adjust_credits'].includes(options.action)) {
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json().catch(() => null);

        await logAdminAction(request, {
          action: options.action,
          resource: options.resource,
          resourceId: options.getResourceId?.(request, data),
          adminId: options.getAdminId?.(request),
          userId: options.getUserId?.(request),
        });
      } catch {
        // Silently fail - don't break the response
      }
    }

    return response;
  };
}

/**
 * Query audit logs with filters
 */
export async function getAuditLogs(params: {
  adminId?: string;
  userId?: string;
  resource?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 50, ...filters } = params;
  const where: Record<string, unknown> = {};

  if (filters.adminId) where.adminId = filters.adminId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.resource) where.resource = filters.resource;
  if (filters.action) where.action = filters.action;

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) (where.createdAt as any).gte = filters.startDate;
    if (filters.endDate) (where.createdAt as any).lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ]);

  return { logs, total, page, limit };
}
