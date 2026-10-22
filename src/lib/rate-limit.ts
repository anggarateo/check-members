import "server-only";

/**
 * Fixed-window rate limiter kept in memory. Fine for a single server instance.
 * If the app runs on many instances or serverless, switch to Redis
 * (for example Upstash) so the counts are shared.
 */
const windows = new Map<string, { start: number; count: number }>();
const WINDOW_MS = 60_000;

export function checkRateLimit(key: string, limit: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || now - entry.start >= WINDOW_MS) {
    windows.set(key, { start: now, count: 1 });
    cleanUp(now);
    return { ok: true, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  const retryAfterSeconds = Math.ceil((entry.start + WINDOW_MS - now) / 1000);
  return { ok: entry.count <= limit, retryAfterSeconds };
}

function cleanUp(now: number) {
  if (windows.size < 10_000) return;
  for (const [k, v] of windows) if (now - v.start >= WINDOW_MS) windows.delete(k);
}
