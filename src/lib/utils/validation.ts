import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');

// Accepts the launch markets' mobile formats (superset — every valid Nigerian
// number still passes). NG: +234/0 7-9…, GH: +233/0 2/3/5…, KE: +254/0 1/7…
export const phoneSchema = z
  .string()
  .regex(
    /^(?:\+234|0)[789][01]\d{8}$|^(?:\+233|0)[235]\d{8}$|^(?:\+254|0)[17]\d{8}$/,
    'Invalid phone number',
  );

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const idSchema = z.string().uuid('Invalid ID format');

export const dateSchema = z.coerce.date();

export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)');

export const partySizeSchema = z
  .number()
  .int()
  .positive()
  .max(50, 'Party size cannot exceed 50');

export const ratingSchema = z.number().int().min(1).max(5);

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const bankAccountSchema = z.object({
  bankName: z.string().min(2, 'Bank name is required'),
  accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
  accountName: z.string().min(2, 'Account name is required'),
});

export const deliveryFeeTypeSchema = z.enum(['flat', 'zone_based']);

export const subscriptionTierSchema = z.enum(['basic', 'pro', 'premium']);

export const verificationStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const reservationStatusSchema = z.enum([
  'pending',
  'confirmed',
  'checked_in',
  'completed',
  'no_show',
  'cancelled',
]);

export const orderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled',
]);

export const orderTypeSchema = z.enum(['pickup', 'delivery']);

export const creditTransactionTypeSchema = z.enum([
  'purchase',
  'refund',
  'bonus',
  'forfeit',
  'redeem',
  'expire',
  'adjustment',
]);

export const documentTypeSchema = z.enum(['cac', 'tin', 'owner_id', 'food_safety']);

export function validateRequest<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  return { success: false, errors };
}
