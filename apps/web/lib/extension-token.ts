import { createHmac, timingSafeEqual } from "crypto";

const SECRET = () => process.env.EXTENSION_TOKEN_SECRET!;

interface ExtTokenPayload {
  founderId: string;
  exp: number;
}

export function mintExtensionToken(founderId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ founderId, exp: Math.floor(Date.now() / 1000) + 15 * 60 } satisfies ExtTokenPayload)
  ).toString("base64url");
  const sig = createHmac("sha256", SECRET()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyExtensionToken(token: string): { founderId: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", SECRET()).update(payload).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  let data: ExtTokenPayload;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString()) as ExtTokenPayload;
  } catch {
    return null;
  }
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  return { founderId: data.founderId };
}
