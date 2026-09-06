import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { WalletBootstrap } from '@/components/dashboard/WalletBootstrap';
import { getSession } from '@/lib/customerAuth';
import { createAdminClient } from '@/lib/supabase';
import { ensureDbUser } from '@/lib/userId';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.stage === 'totp') redirect('/login/verify');

  // Make sure the public.users row exists; the session cookie carries
  // userId, but if the row was deleted out from under us we want to
  // recover gracefully.
  try {
    await Promise.race([
      ensureDbUser(createAdminClient(), session.email),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('user provisioning timeout')), 5000)
      ),
    ]);
  } catch (err) {
    console.error('Failed to provision user row:', err);
  }

  return (
    <>
      <WalletBootstrap />
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}
