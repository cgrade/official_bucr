import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

// GET /api/vendor/orders/[id] - Get order details for vendor
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const order = await db.takeoutOrder.findFirst({
      where: {
        id: params.id,
        vendorId: vendor.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
    });

    if (!order) {
      return notFoundResponse('Order not found');
    }

    return successResponse({
      id: order.id,
      reference: order.reference,
      orderType: order.orderType,
      status: order.status,
      items: order.items,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      paymentConfirmed: order.paymentConfirmed,
      deliveryAddress: order.deliveryAddress,
      deliveryCity: order.deliveryCity,
      deliveryNotes: order.deliveryNotes,
      scheduledTime: order.scheduledTime,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: (order as any).user,
      branch: (order as any).branch,
    });
  } catch (error) {
    console.error('Get vendor order error:', error);
    return errorResponse('Failed to get order', 500);
  }
}
