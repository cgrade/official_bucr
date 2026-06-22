import { db } from '@/lib/db';

/**
 * Record a generated report in history.
 * Lives in lib (not the route file) because Next.js App Router route modules
 * may only export HTTP handlers + route config — not arbitrary helpers.
 */
export async function recordReport(params: {
  type: string;
  generatedBy: string;
  adminId?: string;
  parameters?: Record<string, unknown>;
  fileUrl?: string;
  status?: string;
}) {
  return db.reportHistory.create({
    data: {
      type: params.type,
      generatedBy: params.generatedBy,
      adminId: params.adminId,
      parameters: (params.parameters || {}) as Record<string, string | number | boolean>,
      fileUrl: params.fileUrl,
      status: params.status || 'completed',
    },
  });
}
