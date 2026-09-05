import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase';

export type AdminRole = 'full' | 'view' | 'none';

function splitEmails(raw: string | undefined): string[] {
  return (raw ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * Resolve the Clerk-authenticated user's role in the admin app.
 * Returns 'full' when their email is in ADMIN_EMAILS,
 * 'view' when their email is in ADMIN_VIEW_EMAILS or in the
 * public.view_only_admins table, otherwise 'none'.
 */
export async function getAdminRole(): Promise<AdminRole> {
  const { userId } = auth();
  if (!userId) return 'none';

  const fullEmails = splitEmails(process.env.ADMIN_EMAILS);
  const viewEmails = splitEmails(process.env.ADMIN_VIEW_EMAILS);

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? '';
  if (!email) return 'none';

  if (fullEmails.includes(email)) return 'full';
  if (viewEmails.includes(email)) return 'view';

  // DB-driven view-only allowlist (so you can grant view access
  // without redeploying envs).
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('view_only_admins')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    if (data) return 'view';
  } catch {
    // swallow -- role remains 'none'
  }

  return 'none';
}

/**
 * Admin gate: caller must be signed in via Clerk AND their primary email
 * must be on the full-admin allowlist (ADMIN_EMAILS).
 * Returns null when authorized, or a ready-to-return error response.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const role = await getAdminRole();
  if (role === 'none') {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (role === 'view') {
    return NextResponse.json(
      { error: 'View-only admin cannot perform write operations' },
      { status: 403 }
    );
  }
  return null;
}

/** Page-level check: true when the current user has any admin role. */
export async function isAdmin(): Promise<boolean> {
  return (await getAdminRole()) !== 'none';
}

/** Page-level check: true only for full admins (writes allowed). */
export async function isFullAdmin(): Promise<boolean> {
  return (await getAdminRole()) === 'full';
}

export interface AdminContext {
  email: string;
  role: AdminRole;
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const { userId } = auth();
  if (!userId) return null;
  const role = await getAdminRole();
  if (role === 'none') return null;
  const user = await currentUser();
  return {
    email: user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? '',
    role,
  };
}

/**
 * Best-effort audit log write. Never throws -- a logging failure must
 * not break an already-validated write.
 */
export async function audit(
  ctx: AdminContext | null,
  action: string,
  details: {
    targetTable?: string;
    targetId?: string;
    details?: unknown;
    ip?: string | null;
    userAgent?: string | null;
  } = {}
): Promise<void> {
  if (!ctx) return;
  try {
    const supabase = createAdminClient();
    await supabase.from('admin_audit_log').insert({
      actor_email: ctx.email,
      actor_role: ctx.role,
      action,
      target_table: details.targetTable,
      target_id: details.targetId,
      details: details.details ?? null,
      ip: details.ip ?? null,
      user_agent: details.userAgent ?? null,
    });
  } catch {
    // intentionally swallow
  }
}

