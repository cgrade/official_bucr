import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const order = await db.takeoutOrder.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        branch: {
          select: {
            id: true,
            name: true,
            vendor: {
              select: { id: true, businessName: true },
            },
          },
        },
      },
    });

    if (!order) {
      return errorResponse('Order not found', 404);
    }

    return successResponse(order);
  } catch (error) {
    console.error('Admin get order error:', error);
    return errorResponse('Failed to get order', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { status } = body;

    const order = await db.takeoutOrder.findUnique({
      where: { id: params.id },
    });

    if (!order) {
      return errorResponse('Order not found', 404);
    }

    const updatedOrder = await db.takeoutOrder.update({
      where: { id: params.id },
      data: { 
        status,
        ...(status === 'completed' && { completedAt: new Date() }),
        ...(status === 'cancelled' && { cancelledAt: new Date() }),
      },
    });

    return successResponse(updatedOrder, 'Order status updated');
  } catch (error) {
    console.error('Admin update order error:', error);
    return errorResponse('Failed to update order', 500);
  }
}
