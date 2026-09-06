import { NextRequest, NextResponse } from 'next/server';

/**
 * Customer auth is implemented via a signed cookie (lib/customerAuth.ts).
 *
 * Stages:
 *   - no cookie      -> /login
 *   - stage='totp'    -> /login/verify (when account is TOTP-enrolled and
 *                        the user has just entered the password)
 *   - stage='done'    -> allow through
 *
 * The actual authorization decision is repeated in the (dashboard)
 * layout and in each route handler so this middleware is purely a UX
 * layer that prevents flashing the wrong page.
 */

const COOKIE = 'imnoshi_customer_session';

interface SessionShape {
  email?: string;
  stage?: 'totp' | 'done';
  exp?: number;
}

function decode(raw: string | undefined): SessionShape | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8')
    ) as SessionShape;
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes: marketing pages, login/register/verify, auth API, and
  // the device/marketing endpoints that authenticate themselves via Bearer
  // tokens (rather than the session cookie). The route handlers enforce
  // their own auth, so the middleware just lets them through.
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/login/verify' ||
    pathname === '/api/devices/state' ||
    pathname === '/api/devices/poll' ||
    pathname === '/api/devices/config' ||
    pathname === '/api/fleet' ||
    pathname === '/api/purchase-inquiries' ||
    pathname === '/icon.png' ||
    pathname === '/favicon.ico' ||
    /\.[a-zA-Z0-9]{1,5}$/.test(pathname);

  const cookie = req.cookies.get(COOKIE)?.value;
  const session = decode(cookie);

  if (isPublic) {
    // If the user is fully signed in and tries to visit /login or
    // /register, bounce them home.
    if (
      session?.stage === 'done' &&
      (pathname === '/login' || pathname === '/register' || pathname === '/login/verify')
    ) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (session.stage === 'totp') {
    const url = req.nextUrl.clone();
    url.pathname = '/login/verify';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|.*\\.\\w+).*)', '/', '/(api|trpc)(.*)'],
};