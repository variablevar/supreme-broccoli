import { requireCustomer } from '@/lib/customerAuth';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { ensureDbUser } from '@/lib/userId';

/**
 * GET /api/account/balance
 *
 * Authenticated via the customer cookie. Returns the customer's
 * reconstructed USDT balance straight from the
 * `customer_balance_v` view -- which sums every entry in
 * `balance_ledger` (rewards, admin_credit, admin_debit,
 * payout_recorded, etc.). This is the single source of truth that
 * also feeds the admin's `Balance` page, so the customer and admin
 * always agree.
 */
export async function GET() {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;
  const email = guard.session.email;

  const supabase = createAdminClient();
  const dbUser = await ensureDbUser(supabase, email);

  const { data, error } = await supabase
    .from('customer_balance_v')
    .select('total_credits, total_debits, balance')
    .eq('user_id', dbUser.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    userId: dbUser.id,
    balance: Number(data?.balance ?? 0),
    totalCredits: Number(data?.total_credits ?? 0),
    totalDebits: Number(data?.total_debits ?? 0),
    asOf: new Date().toISOString(),
  });
}
