/**
 * Centralised error capture. For a system that moves money, a silent failure in a cron or
 * a webhook is the worst kind — no user sees a 500, so no one knows. This routes such
 * errors to Sentry (when SENTRY_DSN is set) AND always logs a structured line, so they're
 * alertable in production instead of lost in console noise.
 */
import * as Sentry from '@sentry/node';

let initialised = false;

function ensureInit(): boolean {
  if (initialised) return !!process.env.SENTRY_DSN;
  initialised = true;
  if (!process.env.SENTRY_DSN) return false;
  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0, // errors only; no perf tracing overhead
    });
    return true;
  } catch (e) {
    console.error('[monitoring] Sentry init failed:', (e as Error)?.message);
    return false;
  }
}

export interface CaptureContext {
  /** Where it happened, e.g. "cron:cover-fee-invoice" or "webhook:paystack". */
  scope: string;
  /** Any safe, non-PII detail to attach (ids, counts, references). */
  extra?: Record<string, unknown>;
}

/** Report an error to Sentry (if configured) and always log it with context. */
export function captureException(error: unknown, context: CaptureContext): void {
  const err = error instanceof Error ? error : new Error(String(error));
  // Structured log first — always present, even with no Sentry DSN.
  console.error(`[capture] ${context.scope}: ${err.message}`, context.extra ?? {}, err.stack);
  if (ensureInit()) {
    Sentry.captureException(err, { tags: { scope: context.scope }, extra: context.extra });
  }
}

/** Convenience for unattended jobs: report + return a uniform shape for the cron response. */
export function captureCronError(jobName: string, error: unknown, extra?: Record<string, unknown>) {
  captureException(error, { scope: `cron:${jobName}`, extra });
  return { job: jobName, ok: false, error: error instanceof Error ? error.message : String(error) };
}
