/**
 * Event Service
 * 
 * Handles event creation, listing, ticketing, and bundling with reservations
 */

import { db } from '@/lib/db';
import { generateQRCode, QRCodeData } from './qrcode.service';
import { deductCredits, awardBonus } from './credit.service';

export interface CreateEventParams {
  vendorId: string;
  title: string;
  description?: string;
  date: Date;
  endDate?: Date;
  location: string;
  address?: string;
  city?: string;
  capacity: number;
  ticketPrice: number;
  images?: string[];
  category?: 'dining' | 'concert' | 'wedding' | 'corporate' | 'festival' | 'other';
  bundleDiscount?: number;
}

export async function createEvent(params: CreateEventParams) {
  const {
    vendorId,
    title,
    description,
    date,
    endDate,
    location,
    address,
    city,
    capacity,
    ticketPrice,
    images = [],
    category = 'dining',
    bundleDiscount = 0,
  } = params;

  const event = await db.event.create({
    data: {
      vendorId,
      title,
      description,
      date,
      endDate,
      location,
      address,
      city,
      capacity,
      ticketPrice,
      images,
      category,
      bundleDiscount,
      status: 'draft',
    },
    include: {
      vendor: {
        select: { id: true, businessName: true, slug: true },
      },
    },
  });

  return event;
}

export async function publishEvent(eventId: string) {
  return db.event.update({
    where: { id: eventId },
    data: { status: 'published' },
  });
}

export async function getUpcomingEvents(options: {
  city?: string;
  category?: string;
  vendorId?: string;
  page?: number;
  limit?: number;
} = {}) {
  const { city, category, vendorId, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  const now = new Date();

  const where: any = {
    status: 'published',
    date: { gte: now },
    deletedAt: null,
  };

  if (city) where.city = city;
  if (category) where.category = category;
  if (vendorId) where.vendorId = vendorId;

  const [events, total] = await Promise.all([
    db.event.findMany({
      where,
      orderBy: { date: 'asc' },
      skip,
      take: limit,
      include: {
        vendor: {
          select: { id: true, businessName: true, slug: true, logo: true },
        },
        _count: {
          select: { tickets: true },
        },
      },
    }),
    db.event.count({ where }),
  ]);

  // Calculate remaining capacity for each event
  const eventsWithCapacity = events.map((event) => ({
    ...event,
    ticketsSold: event._count.tickets,
    remainingCapacity: event.capacity - event._count.tickets,
  }));

  return { events: eventsWithCapacity, total, page, limit };
}

export async function getEventById(eventId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      vendor: {
        select: { 
          id: true, 
          businessName: true, 
          slug: true, 
          logo: true,
          description: true,
        },
      },
      _count: {
        select: { tickets: true, bundles: true },
      },
    },
  });

  if (!event) return null;

  return {
    ...event,
    ticketsSold: event._count.tickets,
    remainingCapacity: event.capacity - event._count.tickets,
  };
}

export interface PurchaseTicketParams {
  userId: string;
  eventId: string;
  quantity: number;
}

export async function purchaseEventTicket(params: PurchaseTicketParams) {
  const { userId, eventId, quantity } = params;

  const event = await getEventById(eventId);
  if (!event) throw new Error('Event not found');
  if (event.status !== 'published') throw new Error('Event is not available');
  if (event.remainingCapacity < quantity) throw new Error('Not enough tickets available');

  const totalCredits = event.ticketPrice * quantity;

  // Deduct credits from user
  await deductCredits({
    userId,
    credits: totalCredits,
    referenceType: 'event_ticket',
    referenceId: eventId,
    description: `Purchased ${quantity} ticket(s) for ${event.title}`,
  });

  // Generate QR code
  const qrData: QRCodeData = { type: 'event_ticket', id: eventId, eventId, userId, quantity };
  const qrCode = await generateQRCode(qrData);

  // Create ticket
  const ticket = await db.eventTicket.create({
    data: {
      eventId,
      userId,
      quantity,
      totalCredits,
      status: 'confirmed',
      qrCode,
    },
    include: {
      event: {
        select: { title: true, date: true, location: true },
      },
    },
  });

  return ticket;
}

export interface CreateBundleParams {
  userId: string;
  eventId: string;
  reservationId: string;
}

export async function createEventBundle(params: CreateBundleParams) {
  const { userId, eventId, reservationId } = params;

  // Get event and reservation
  const [event, reservation] = await Promise.all([
    getEventById(eventId),
    db.reservation.findUnique({ where: { id: reservationId } }),
  ]);

  if (!event) throw new Error('Event not found');
  if (!reservation) throw new Error('Reservation not found');
  if (reservation.userId !== userId) throw new Error('Reservation does not belong to user');

  // Calculate bundle pricing (15% deposit, with bundle discount)
  const eventCredits = event.ticketPrice;
  const discountedCredits = Math.floor(eventCredits * (1 - event.bundleDiscount / 100));
  const depositCredits = Math.floor(discountedCredits * 0.15); // 15% deposit

  // Deduct deposit credits
  await deductCredits({
    userId,
    credits: depositCredits,
    referenceType: 'event_bundle',
    referenceId: eventId,
    description: `Bundle deposit for ${event.title}`,
  });

  // Generate QR code
  const qrData: QRCodeData = { type: 'event_bundle', id: eventId, eventId, reservationId, userId };
  const qrCode = await generateQRCode(qrData);

  // Create bundle
  const bundle = await db.eventBundle.create({
    data: {
      userId,
      eventId,
      reservationId,
      totalCredits: discountedCredits,
      depositCredits,
      status: 'pending',
      qrCode,
    },
    include: {
      event: {
        select: { title: true, date: true, location: true },
      },
      reservation: {
        select: { reference: true, date: true, time: true },
      },
    },
  });

  return bundle;
}

export async function checkInEventTicket(ticketId: string) {
  const ticket = await db.eventTicket.findUnique({
    where: { id: ticketId },
    include: { user: { select: { id: true } } },
  });

  if (!ticket) throw new Error('Ticket not found');
  if (ticket.status === 'checked_in') throw new Error('Ticket already checked in');
  if (ticket.status === 'cancelled') throw new Error('Ticket was cancelled');

  return db.eventTicket.update({
    where: { id: ticketId },
    data: {
      status: 'checked_in',
      checkedInAt: new Date(),
    },
  });
}

export async function checkInEventBundle(bundleId: string) {
  const bundle = await db.eventBundle.findUnique({
    where: { id: bundleId },
    include: { 
      user: { select: { id: true } },
      reservation: true,
    },
  });

  if (!bundle) throw new Error('Bundle not found');
  if (bundle.status === 'completed') throw new Error('Bundle already completed');
  if (bundle.status === 'cancelled') throw new Error('Bundle was cancelled');

  // Check if reservation was checked in
  if (bundle.reservation?.status !== 'checked_in') {
    throw new Error('Reservation must be checked in first');
  }

  // Award 5% bonus for full attendance
  const bonusCredits = Math.floor(bundle.depositCredits * 0.05);
  
  if (bonusCredits > 0) {
    await awardBonus({
      userId: bundle.userId,
      credits: bonusCredits,
      referenceType: 'event_bundle',
      referenceId: bundleId,
      description: `Bundle attendance bonus for completing reservation + event`,
    });
  }

  return db.eventBundle.update({
    where: { id: bundleId },
    data: {
      status: 'completed',
      bonusCredits,
      checkedInAt: new Date(),
    },
  });
}

export async function getUserEventTickets(userId: string) {
  return db.eventTicket.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      event: {
        select: { 
          title: true, 
          date: true, 
          location: true, 
          images: true,
          vendor: {
            select: { businessName: true, slug: true },
          },
        },
      },
    },
  });
}

export async function getUserEventBundles(userId: string) {
  return db.eventBundle.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      event: {
        select: { title: true, date: true, location: true, images: true },
      },
      reservation: {
        select: { reference: true, date: true, time: true, status: true },
      },
    },
  });
}

export async function getVendorEvents(vendorId: string, options: {
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const { status, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where: any = { vendorId, deletedAt: null };
  if (status) where.status = status;

  const [events, total] = await Promise.all([
    db.event.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: limit,
      include: {
        _count: {
          select: { tickets: true, bundles: true },
        },
      },
    }),
    db.event.count({ where }),
  ]);

  return { events, total, page, limit };
}

export async function updateEvent(eventId: string, data: Partial<CreateEventParams>) {
  return db.event.update({
    where: { id: eventId },
    data,
  });
}

export async function cancelEvent(eventId: string, reason?: string) {
  // Get all tickets and bundles for refunds
  const [tickets, bundles] = await Promise.all([
    db.eventTicket.findMany({ where: { eventId, status: 'confirmed' } }),
    db.eventBundle.findMany({ where: { eventId, status: { in: ['pending', 'confirmed'] } } }),
  ]);

  // Refund all tickets (100% + 10% bonus for vendor cancellation)
  for (const ticket of tickets) {
    const refundAmount = Math.floor(ticket.totalCredits * 1.1);
    await awardBonus({
      userId: ticket.userId,
      credits: refundAmount,
      referenceType: 'event_cancellation',
      referenceId: eventId,
      description: `Refund for cancelled event (100% + 10% bonus)`,
    });

    await db.eventTicket.update({
      where: { id: ticket.id },
      data: { status: 'cancelled' },
    });
  }

  // Refund all bundle deposits (100% + 10% bonus)
  for (const bundle of bundles) {
    const refundAmount = Math.floor(bundle.depositCredits * 1.1);
    await awardBonus({
      userId: bundle.userId,
      credits: refundAmount,
      referenceType: 'event_cancellation',
      referenceId: eventId,
      description: `Bundle deposit refund for cancelled event (100% + 10% bonus)`,
    });

    await db.eventBundle.update({
      where: { id: bundle.id },
      data: { status: 'cancelled' },
    });
  }

  return db.event.update({
    where: { id: eventId },
    data: { status: 'cancelled' },
  });
}
