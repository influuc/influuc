// Lightweight, dependency-free error reporting (SCRUM-19).
// Sends to Sentry via the envelope endpoint when a DSN is configured; otherwise
// logs to console. No SDK, so no build weight. Set SENTRY_DSN (server) and/or
// NEXT_PUBLIC_SENTRY_DSN (client) to activate.

function hex(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

function parseStack(stack: string | undefined) {
  if (!stack) return undefined;
  const frames = stack.split("\n").slice(1).map((l) => l.trim()).filter(Boolean).reverse()
    .map((line) => ({ function: line.replace(/^at\s+/, "").split(" (")[0], filename: (line.match(/\((.*)\)/)?.[1]) ?? line }));
  return frames.length ? { frames } : undefined;
}

export async function captureException(err: unknown, context?: Record<string, unknown>): Promise<void> {
  const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err));

  // Always log so failures are never silent, even without a DSN.
  // eslint-disable-next-line no-console
  console.error("[captureException]", e.message, context ?? "");

  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const m = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
  if (!m) return;
  const [, key, host, projectId] = m;

  const eventId = hex(32);
  const nowIso = new Date().toISOString();
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "production",
    exception: { values: [{ type: e.name, value: e.message, stacktrace: parseStack(e.stack) }] },
    extra: context,
  };

  const body =
    JSON.stringify({ event_id: eventId, sent_at: nowIso }) + "\n" +
    JSON.stringify({ type: "event" }) + "\n" +
    JSON.stringify(event);

  try {
    await fetch(`https://${host}/api/${projectId}/envelope/?sentry_key=${key}&sentry_version=7`, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
    });
  } catch {
    // never let error reporting throw
  }
}
