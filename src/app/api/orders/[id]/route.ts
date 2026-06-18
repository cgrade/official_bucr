import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';
import { cancelOrder } from '@/services/order.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload) {
      return unauthorizedResponse();
    }

    const order = await db.takeoutOrder.findUnique({
      where: { id: params.id },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            phone: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountName: true,
            paystackLink: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return notFoundResponse('Order');
    }

    // Check access
    if (payload.role === 'user' && order.userId !== payload.sub) {
      return unauthorizedResponse('Not authorized to view this order');
    }

    if (payload.role === 'vendor') {
      const vendor = await db.vendor.findFirst({
        where: { ownerId: payload.sub, id: order.vendorId },
      });
      if (!vendor) {
        return unauthorizedResponse('Not authorized to view this order');
      }
    }

    return successResponse({
      ...order,
      paymentDetails: {
        bankName: order.vendor.bankName,
        bankAccountNumber: order.vendor.bankAccountNumber,
        bankAccountName: order.vendor.bankAccountName,
        paystackLink: order.vendor.paystackLink,
      },
    });
  } catch (error) {
    console.error('Get order error:', error);
    return errorResponse('Failed to get order', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || undefined;

    const result = await cancelOrder(params.id, payload.sub, reason);

    return successResponse(result, 'Order cancelled successfully');
  } catch (error) {
    console.error('Cancel order error:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to cancel order', 500);
  }
}
