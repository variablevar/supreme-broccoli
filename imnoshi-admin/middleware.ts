import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin auth is implemented via a signed cookie (lib/adminAuth.ts).
 * The middleware protects everything outside the login/setup flow and
 * redirects based on the current session stage:
 *   - no cookie       -> /login
 *   - stage='reset'   -> /login/setup
 *   - stage='totp'    -> /login/verify
 *   - stage='done'    -> allow through
 *
 * The actual authorization decision is repeated in the (admin) layout
 * and route handlers so the middleware is purely a UX layer.
 */

const COOKIE = 'imnoshi_admin_session';

interface SessionShape {
  email?: string;
  stage?: 'reset' | 'totp' | 'done';
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

  // Public auth pages and the API routes that drive them.
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/login/setup' ||
    pathname === '/login/verify' ||
    pathname.startsWith('/api/auth/');

  const cookie = req.cookies.get(COOKIE)?.value;
  const session = decode(cookie);

  if (isAuthRoute) {
    // Already fully signed in? bounce to home.
    if (
      session?.stage === 'done' &&
      (pathname === '/login' || pathname === '/login/setup' || pathname === '/login/verify')
    ) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
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

  if (session.stage === 'reset') {
    const url = req.nextUrl.clone();
    url.pathname = '/login/setup';
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