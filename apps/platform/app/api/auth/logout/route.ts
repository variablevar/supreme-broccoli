import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/customerAuth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  await clearSessionCookie(res);
  return res;
}