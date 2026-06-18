export type UserRole = 'user' | 'vendor' | 'admin';

export type SubscriptionTier = 'basic' | 'pro' | 'premium';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'no_show'
  | 'cancelled';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type OrderType = 'pickup' | 'delivery';

export type CreditTransactionType =
  | 'purchase'
  | 'refund'
  | 'bonus'
  | 'forfeit'
  | 'redeem'
  | 'expire'
  | 'adjustment';

export type DocumentType = 'cac' | 'tin' | 'food_safety';

export type DeliveryFeeType = 'flat' | 'zone_based';

export type WaitlistStatus = 'waiting' | 'notified' | 'claimed' | 'expired';

export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DeliveryZone {
  name: string;
  minDistanceKm: number;
  maxDistanceKm: number;
  fee: number;
}

export interface OperatingHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
