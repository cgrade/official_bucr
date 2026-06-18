import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get recent activities from various sources
    const [
      recentUsers,
      recentVendors,
      recentReservations,
      recentOrders,
      recentPayments,
      recentDocuments,
    ] = await Promise.all([
      // Recent user registrations
      db.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
      // Recent vendor registrations
      db.vendor.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          businessName: true,
          verificationStatus: true,
          createdAt: true,
        },
      }),
      // Recent reservations
      db.reservation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          reference: true,
          status: true,
          createdAt: true,
          user: { select: { name: true } },
          vendor: { select: { businessName: true } },
        },
      }),
      // Recent orders
      db.takeoutOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { name: true } },
          vendor: { select: { businessName: true } },
        },
      }),
      // Recent payments
      db.payment.findMany({
        where: { status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          reference: true,
          purpose: true,
          amountKobo: true,
          createdAt: true,
        },
      }),
      // Recent document submissions
      db.vendorDocument.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          vendor: { select: { businessName: true } },
        },
      }),
    ]);

    // Combine into activity feed
    const activities: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: Date;
      status?: string;
      metadata?: Record<string, unknown>;
    }> = [];

    // Add user registrations
    recentUsers.forEach((user) => {
      activities.push({
        id: `user-${user.id}`,
        type: 'user_signup',
        title: 'New User Registration',
        description: `${user.name} created new account`,
        timestamp: user.createdAt,
        status: 'success',
        metadata: { userId: user.id, email: user.email },
      });
    });

    // Add vendor registrations
    recentVendors.forEach((vendor) => {
      activities.push({
        id: `vendor-${vendor.id}`,
        type: 'vendor_registration',
        title: 'New Vendor Registration',
        description: `${vendor.businessName} registered as new vendor`,
        timestamp: vendor.createdAt,
        status: vendor.verificationStatus === 'approved' ? 'success' : 'pending',
        metadata: { vendorId: vendor.id, status: vendor.verificationStatus },
      });
    });

    // Add reservations
    recentReservations.forEach((reservation) => {
      activities.push({
        id: `reservation-${reservation.id}`,
        type: 'reservation',
        title: 'New Reservation',
        description: `${reservation.user?.name || 'Guest'} booked at ${reservation.vendor?.businessName || 'Unknown'}`,
        timestamp: reservation.createdAt,
        status: reservation.status === 'confirmed' ? 'success' : 'pending',
        metadata: { reservationId: reservation.id, reference: reservation.reference, status: reservation.status },
      });
    });

    // Add orders
    recentOrders.forEach((order) => {
      activities.push({
        id: `order-${order.id}`,
        type: 'payment',
        title: 'New Order',
        description: `${order.user?.name || 'Guest'} ordered from ${order.vendor?.businessName || 'Unknown'} - ₦${(order.total / 100).toLocaleString()}`,
        timestamp: order.createdAt,
        status: order.status === 'completed' ? 'success' : 'pending',
        metadata: { orderId: order.id, reference: order.reference, amount: order.total },
      });
    });

    // Add payments
    recentPayments.forEach((payment) => {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        title: 'Payment Completed',
        description: `Credits purchased - ₦${(payment.amountKobo / 100).toLocaleString()}`,
        timestamp: payment.createdAt,
        status: 'success',
        metadata: { paymentId: payment.id, reference: payment.reference, purpose: payment.purpose },
      });
    });

    // Add pending documents
    recentDocuments.forEach((doc) => {
      activities.push({
        id: `document-${doc.id}`,
        type: 'vendor_registration',
        title: 'Document Pending Review',
        description: `${doc.vendor?.businessName || 'Unknown'} submitted ${doc.type.toUpperCase()}`,
        timestamp: doc.createdAt,
        status: 'pending',
        metadata: { documentId: doc.id, type: doc.type },
      });
    });

    // Sort by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit results
    const limitedActivities = activities.slice(0, limit);

    return successResponse({
      activities: limitedActivities,
      total: activities.length,
    });
  } catch (error) {
    console.error('Admin get activity error:', error);
    return errorResponse('Failed to get activity', 500);
  }
}
