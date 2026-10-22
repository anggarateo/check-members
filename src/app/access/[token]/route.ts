import { NextResponse, type NextRequest } from "next/server";
import { checkToken } from "@/lib/access";
import { ACCESS_COOKIE } from "@/lib/token";

/**
 * The shared link looks like /access/<token>.
 * The token is moved into an httpOnly cookie and the user is sent to "/", so the token
 * does not stay in the address bar, the browser history, or screenshots.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const active = await checkToken(token);

  if (!active) return NextResponse.redirect(new URL("/?access=invalid", req.url));

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(active.expiresAt ? { expires: active.expiresAt } : { maxAge: 60 * 60 * 24 * 30 }),
  });
  return res;
}
