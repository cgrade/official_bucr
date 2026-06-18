import { db } from '@/lib/db';
import { generateOrderReference } from '@/lib/utils/helpers';
import type { OrderItem } from '@/types';
import { sendOrderConfirmation } from './email.service';
import { notifyOrderStatusUpdate } from './notification.service';

export interface CreateOrderParams {
  userId: string;
  vendorId: string;
  branchId?: string;
  orderType: 'pickup' | 'delivery';
  items: OrderItem[];
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryNotes?: string;
  scheduledTime?: Date;
}

export async function calculateDeliveryFee(
  vendorId: string,
  deliveryAddress?: string
): Promise<number> {
  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
    select: {
      deliveryEnabled: true,
      deliveryFeeType: true,
      deliveryFlatFee: true,
      deliveryZones: true,
    },
  });

  if (!vendor || !vendor.deliveryEnabled) {
    return 0;
  }

  if (vendor.deliveryFeeType === 'flat' && vendor.deliveryFlatFee) {
    return vendor.deliveryFlatFee;
  }

  // For zone-based, we'd need to calculate distance
  // For now, return the first zone fee or flat fee as fallback
  if (vendor.deliveryFeeType === 'zone_based' && vendor.deliveryZones) {
    const zones = vendor.deliveryZones as Array<{ fee: number }>;
    if (zones.length > 0) {
      return zones[0].fee;
    }
  }

  return vendor.deliveryFlatFee || 0;
}

export async function createOrder(params: CreateOrderParams) {
  const {
    userId,
    vendorId,
    branchId,
    orderType,
    items,
    deliveryAddress,
    deliveryCity,
    deliveryNotes,
    scheduledTime,
  } = params;

  // Verify vendor exists and is active
  const vendor = await db.vendor.findUnique({
    where: { id: vendorId, deletedAt: null, verificationStatus: 'approved' },
    select: {
      id: true,
      businessName: true,
      deliveryEnabled: true,
      minDeliveryOrder: true,
    },
  });

  if (!vendor) {
    throw new Error('Vendor not found or not verified');
  }

  // Validate order type
  if (orderType === 'delivery' && !vendor.deliveryEnabled) {
    throw new Error('This vendor does not offer delivery');
  }

  // Calculate subtotal from items
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Check minimum order for delivery
  if (orderType === 'delivery' && vendor.minDeliveryOrder && subtotal < vendor.minDeliveryOrder) {
    throw new Error(`Minimum order for delivery is ₦${vendor.minDeliveryOrder / 100}`);
  }

  // Calculate delivery fee
  let deliveryFee = 0;
  if (orderType === 'delivery') {
    deliveryFee = await calculateDeliveryFee(vendorId, deliveryAddress);
  }

  const total = subtotal + deliveryFee;

  // Generate reference
  const reference = generateOrderReference();

  // Create order
  const order = await db.takeoutOrder.create({
    data: {
      userId,
      vendorId,
      branchId,
      reference,
      orderType,
      items: items as object[],
      subtotal,
      deliveryFee,
      total,
      deliveryAddress,
      deliveryCity,
      deliveryNotes,
      scheduledTime,
      status: 'pending',
      paymentConfirmed: false,
    },
    include: {
      vendor: {
        select: {
          businessName: true,
          slug: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
          paystackLink: true,
        },
      },
      branch: {
        select: {
          name: true,
          address: true,
          city: true,
          phone: true,
        },
      },
    },
  });

  // Send order confirmation email (fire-and-forget)
  const userForEmail = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (userForEmail?.email) {
    sendOrderConfirmation({
      to: userForEmail.email,
      userName: userForEmail.name,
      vendorName: order.vendor?.businessName || 'Restaurant',
      reference,
      orderType,
      items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      subtotal,
      deliveryFee,
      total,
    }).catch((err) => console.error('Failed to send order email:', err));
  }

  // Push notification (fire-and-forget)
  notifyOrderStatusUpdate(userId, {
    vendorName: order.vendor?.businessName || 'Restaurant',
    status: 'confirmed',
    reference,
  }).catch((err) => console.error('Failed to send order push:', err));

  return order;
}

export async function confirmOrderPayment(orderId: string, userId: string) {
  const order = await db.takeoutOrder.findFirst({
    where: { id: orderId, userId, status: 'pending' },
  });

  if (!order) {
    throw new Error('Order not found or already processed');
  }

  const updatedOrder = await db.takeoutOrder.update({
    where: { id: orderId },
    data: {
      paymentConfirmed: true,
      paymentConfirmedAt: new Date(),
      status: 'confirmed',
    },
  });

  return updatedOrder;
}

export async function updateOrderStatus(
  orderId: string,
  vendorId: string,
  status: 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled',
  cancellationReason?: string
) {
  const order = await db.takeoutOrder.findFirst({
    where: { id: orderId, vendorId },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['out_for_delivery', 'completed', 'cancelled'],
    out_for_delivery: ['completed', 'cancelled'],
  };

  if (!validTransitions[order.status]?.includes(status)) {
    throw new Error(`Cannot transition from ${order.status} to ${status}`);
  }

  const updateData: Record<string, unknown> = { status };

  if (status === 'completed') {
    updateData.completedAt = new Date();
  }

  if (status === 'cancelled') {
    updateData.cancelledAt = new Date();
    updateData.cancelledBy = 'vendor';
    updateData.cancellationReason = cancellationReason;
  }

  const updatedOrder = await db.takeoutOrder.update({
    where: { id: orderId },
    data: updateData,
  });

  return updatedOrder;
}

export async function cancelOrder(
  orderId: string,
  userId: string,
  reason?: string
) {
  const order = await db.takeoutOrder.findFirst({
    where: {
      id: orderId,
      userId,
      status: { in: ['pending', 'confirmed'] },
    },
  });

  if (!order) {
    throw new Error('Order not found or cannot be cancelled');
  }

  const updatedOrder = await db.takeoutOrder.update({
    where: { id: orderId },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: 'user',
      cancellationReason: reason,
    },
  });

  return updatedOrder;
}
