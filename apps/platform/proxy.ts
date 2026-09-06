import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/modules/auth/tokens';
export function proxy(req: NextRequest) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const expected = process.env.APP_ORIGIN || req.nextUrl.origin;
    if (!sameOrigin(req.headers.get('origin'), expected, req.headers.get('sec-fetch-site'))) {
      return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 });
    }
    if (Number(req.headers.get('content-length') || 0) > 16384) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }
  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
export const config = { matcher: ['/api/:path*'] };
