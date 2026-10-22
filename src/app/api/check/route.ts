import { NextResponse, type NextRequest } from "next/server";
import { checkToken } from "@/lib/access";
import { checkRateLimit } from "@/lib/rate-limit";
import { searchMember } from "@/lib/search";
import { ACCESS_COOKIE } from "@/lib/token";
import { searchSchema } from "@/lib/validation";

const LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 20);

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function clientIp(req: NextRequest): string {
  // Only trustworthy if the app runs behind a reverse proxy that sets this header.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

// Error messages below are shown on the web page, so they stay in Indonesian.
export async function POST(req: NextRequest) {
  const token = await checkToken(req.cookies.get(ACCESS_COOKIE)?.value);
  if (!token) return json({ error: "Akses tidak valid. Buka ulang link yang diberikan." }, 401);

  // Limit per IP and per token, so one leaked link cannot be used to guess the whole list.
  for (const key of [`ip:${clientIp(req)}`, `token:${token.id}`]) {
    const limit = key.startsWith("ip:") ? LIMIT : LIMIT * 10;
    const rl = checkRateLimit(key, limit);
    if (!rl.ok) {
      return json({ error: `Terlalu banyak pencarian. Coba lagi dalam ${rl.retryAfterSeconds} detik.` }, 429, {
        "Retry-After": String(rl.retryAfterSeconds),
      });
    }
  }

  const body = await req.json().catch(() => null);
  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid" }, 400);

  try {
    return json(await searchMember(parsed.data.name));
  } catch (err) {
    console.error("member check failed", err);
    return json({ error: "Terjadi kesalahan di server. Coba lagi nanti." }, 500);
  }
}
