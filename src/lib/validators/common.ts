import { z } from 'zod';

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Search validation
export const searchSchema = z.object({
  q: z.string().min(1).max(100).trim().optional(),
  filters: z.record(z.string()).optional(),
});

// MongoDB ObjectId validation
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Email validation
export const emailSchema = z.string().email('Invalid email address').toLowerCase();

// Phone validation (Nigerian format)
export const phoneSchema = z.string().regex(
  /^(\+234|0)[789][01]\d{8}$/,
  'Invalid Nigerian phone number'
);

// Date range validation
export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  { message: 'Start date must be before end date' }
);

// Common status filters
export const statusFilterSchema = z.enum([
  'active',
  'inactive',
  'pending',
  'approved',
  'rejected',
  'suspended',
]).optional();

// Price validation (in kobo/cents to avoid float issues)
export const priceSchema = z.number().int().min(0);

// Rating validation
export const ratingSchema = z.number().int().min(1).max(5);

// Slug validation
export const slugSchema = z.string()
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .min(3)
  .max(50);

// Image upload validation
export const imageUploadSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  format: z.enum(['jpg', 'jpeg', 'png', 'webp', 'gif']).optional(),
  size: z.number().int().positive().max(5 * 1024 * 1024), // 5MB max
});

// Coordinates validation
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Address validation
export const addressSchema = z.object({
  street: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  country: z.string().default('Nigeria'),
  postalCode: z.string().optional(),
  coordinates: coordinatesSchema.optional(),
});

// Time slot validation
export const timeSlotSchema = z.string().regex(
  /^([01]\d|2[0-3]):([0-5]\d)$/,
  'Invalid time format (HH:MM)'
);

// Business hours validation
export const businessHoursSchema = z.object({
  monday: z.object({ open: timeSlotSchema, close: timeSlotSchema }).nullable(),
  tuesday: z.object({ open: timeSlotSchema, close: timeSlotSchema }).nullable(),
  wednesday: z.object({ open: timeSlotSchema, close: timeSlotSchema }).nullable(),
  thursday: z.object({ open: timeSlotSchema, close: timeSlotSchema }).nullable(),
  friday: z.object({ open: timeSlotSchema, close: timeSlotSchema }).nullable(),
  saturday: z.object({ open: timeSlotSchema, close: timeSlotSchema }).nullable(),
  sunday: z.object({ open: timeSlotSchema, close: timeSlotSchema }).nullable(),
});

// Parse query params helper
export function parseQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  const params = Object.fromEntries(searchParams.entries());
  return schema.parse(params);
}

// Sanitize string input
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
}
