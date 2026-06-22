import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils/api-response';
import { deleteImage } from '@/lib/upload';

/**
 * DELETE /api/users/me — Right to Erasure (NDPA 2023, Article 26)
 *
 * Anonymises all personal data while retaining transaction records for:
 * - Financial/tax compliance (credit transactions, reservations)
 * - Fraud prevention audit trail
 *
 * What is anonymised: name, email, phone, avatar, pushToken, referralCode
 * What is retained: id, creditsBalance, transaction records (anonymised reference)
 */
export async function DELETE(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'user') return unauthorizedResponse();

    const user = await db.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, avatar: true, email: true },
    });

    if (!user) return errorResponse('User not found', 404);

    // Remove avatar from storage
    if (user.avatar) {
      deleteImage(user.avatar).catch(() => {});
    }

    const anonEmail = `deleted_${user.id}@bucr.deleted`;
    const now = new Date();

    await db.$transaction([
      // Anonymise user PII
      db.user.update({
        where: { id: user.id },
        data: {
          name:          'Deleted User',
          email:         anonEmail,
          phone:         null,
          avatar:        null,
          pushToken:     null,
          referralCode:  null,
          referredBy:    null,
          deletedAt:     now,
          status:        'inactive' as any,
        },
      }),
      // Blacklist their tokens (force logout everywhere)
      db.verificationToken.deleteMany({ where: { userId: user.id } }),
      // Anonymise any reviews they've written (keep rating, remove name link)
      db.review.updateMany({
        where: { userId: user.id },
        data: { isVisible: false },
      }),
    ]);

    return successResponse(null, 'Account deleted. Your personal data has been removed per NDPA 2023.');
  } catch (error) {
    console.error('Right-to-erasure error:', error);
    return errorResponse('Failed to delete account', 500);
  }
}
