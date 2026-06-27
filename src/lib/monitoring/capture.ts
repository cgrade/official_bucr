/**
 * Centralised error capture. For a system that moves money, a silent failure in a cron or
 * a webhook is the worst kind — no user sees a 500, so no one knows. This is the single
 * choke point those paths report through, so the errors are structured + alertable rather
 * than lost in console noise.
 *
 * Transport: structured stderr today (pick these up via the host's log drain / alerting —
 * Vercel log drains, CloudWatch, etc.). To forward to Sentry, add @sentry/nextjs with an
 * instrumentation hook (the Next-recommended path) and call Sentry.captureException inside
 * `report()` — every critical path already funnels through here, so it's a one-place change.
 */

export interface CaptureContext {
  /** Where it happened, e.g. "cron:cover-fee-invoice" or "webhook:paystack". */
  scope: string;
  /** Any safe, non-PII detail to attach (ids, counts, references). */
  extra?: Record<string, unknown>;
}

/** Report an error with context. Always logs a single structured line. */
export function captureException(error: unknown, context: CaptureContext): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: 'error',
      event: 'capture',
      scope: context.scope,
      message: err.message,
      ...(context.extra ? { extra: context.extra } : {}),
    }),
    err.stack,
  );
}

/** Convenience for unattended jobs: report + return a uniform shape for the cron response. */
export function captureCronError(jobName: string, error: unknown, extra?: Record<string, unknown>) {
  captureException(error, { scope: `cron:${jobName}`, extra });
  return { job: jobName, ok: false, error: error instanceof Error ? error.message : String(error) };
}
