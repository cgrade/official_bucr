import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from '@/lib/utils/api-response';
import { z } from 'zod';

const schema = z.object({
  isAvailable:         z.boolean().optional(),
  availableForDineIn:  z.boolean().optional(),
  availableForTakeout: z.boolean().optional(),
  unavailableUntil:    z.union([
    z.string().datetime(),
    z.enum(['end_of_service', '2h', '4h', 'permanent']),
    z.null(),
  ]).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field' });

function resolveUnavailableUntil(raw: string | null | undefined): Date | null | undefined {
  if (raw === null)        return null;
  if (raw === undefined)   return undefined;
  if (raw === 'permanent') return null;
  const now = new Date();
  if (raw === '2h')          return new Date(now.getTime() + 2 * 60 * 60 * 1000);
  if (raw === '4h')          return new Date(now.getTime() + 4 * 60 * 60 * 1000);
  if (raw === 'end_of_service') {
    const eod = new Date(now);
    eod.setHours(23, 59, 0, 0);
    return eod;
  }
  return new Date(raw);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(request);
    if (!user || user.role !== 'vendor') return unauthorizedResponse();

    const vendor = await db.vendor.findFirst({
      where: { ownerId: user.sub, deletedAt: null },
      select: { id: true },
    });
    if (!vendor) return forbiddenResponse('Vendor not found');

    const item = await db.menu.findFirst({
      where: { id: params.id, vendorId: vendor.id, deletedAt: null },
    });
    if (!item) return notFoundResponse('Menu item');

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.message, 400);

    const { isAvailable, availableForDineIn, availableForTakeout, unavailableUntil } = parsed.data;
    const resolvedUntil = resolveUnavailableUntil(unavailableUntil);

    const updated = await db.menu.update({
      where: { id: params.id },
      data: {
        ...(isAvailable        !== undefined && { isAvailable }),
        ...(availableForDineIn !== undefined && { availableForDineIn }),
        ...(availableForTakeout !== undefined && { availableForTakeout }),
        ...(resolvedUntil !== undefined && { unavailableUntil: resolvedUntil }),
      },
    });

    db.auditLog.create({
      data: {
        vendorId: vendor.id,
        action: 'update',
        resource: 'menu',
        resourceId: params.id,
        changes: { isAvailable, availableForDineIn, availableForTakeout, unavailableUntil },
      } as any,
    }).catch(() => {});

    return successResponse(updated, 'Menu item availability updated');
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Update failed', 500);
  }
}
