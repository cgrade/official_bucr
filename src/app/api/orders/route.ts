import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { createOrder } from '@/services/order.service';
import { sendOrderConfirmation } from '@/services/email.service';
import { db } from '@/lib/db';

const orderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().int().positive(),
  notes: z.string().optional(),
});

const createOrderSchema = z.object({
  vendorId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  orderType: z.enum(['pickup', 'delivery']),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  deliveryAddress: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryNotes: z.string().optional(),
  scheduledTime: z.coerce.date().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    // Validate delivery address for delivery orders
    if (data.orderType === 'delivery' && !data.deliveryAddress) {
      return validationErrorResponse(['Delivery address is required for delivery orders']);
    }

    const order = await createOrder({
      userId: payload.sub,
      vendorId: data.vendorId,
      branchId: data.branchId,
      orderType: data.orderType,
      items: data.items,
      deliveryAddress: data.deliveryAddress,
      deliveryCity: data.deliveryCity,
      deliveryNotes: data.deliveryNotes,
      scheduledTime: data.scheduledTime,
    });

    // Get user details for email
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { name: true, email: true },
    });

    // Send confirmation email (async)
    if (user?.email) {
      sendOrderConfirmation({
        to: user.email,
        userName: user.name,
        vendorName: order.vendor.businessName,
        orderType: order.orderType,
        items: data.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price / 100,
        })),
        subtotal: order.subtotal / 100,
        deliveryFee: order.deliveryFee / 100,
        total: order.total / 100,
        reference: order.reference,
        scheduledTime: order.scheduledTime?.toLocaleString(),
      }).catch(console.error);
    }

    return successResponse(
      {
        id: order.id,
        reference: order.reference,
        orderType: order.orderType,
        items: order.items,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        status: order.status,
        vendor: {
          businessName: order.vendor.businessName,
          slug: order.vendor.slug,
        },
        branch: order.branch,
        paymentDetails: {
          bankName: order.vendor.bankName,
          bankAccountNumber: order.vendor.bankAccountNumber,
          bankAccountName: order.vendor.bankAccountName,
          paystackLink: order.vendor.paystackLink,
        },
        deliveryAddress: order.deliveryAddress,
        scheduledTime: order.scheduledTime,
        createdAt: order.createdAt,
      },
      'Order created successfully. Please complete payment to vendor.',
      undefined,
      201
    );
  } catch (error) {
    console.error('Create order error:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to create order', 500);
  }
}
