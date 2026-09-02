import { auth, currentUser } from '@clerk/nextjs/server';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { WalletBootstrap } from '@/components/dashboard/WalletBootstrap';
import { createAdminClient } from '@/lib/supabase';
import { ensureDbUser } from '@/lib/userId';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Provision the Supabase user row server-side on any dashboard load, so the
  // record exists even if client-side fetches fail. Bounded by a timeout so a
  // slow Clerk/Supabase call can never block page rendering.
  const { userId } = auth();
  if (userId) {
    try {
      await Promise.race([
        (async () => {
          const clerkUser = await currentUser();
          const email = clerkUser?.primaryEmailAddress?.emailAddress ?? '';
          await ensureDbUser(createAdminClient(), userId, email);
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('user provisioning timeout')), 5000)
        ),
      ]);
    } catch (err) {
      console.error('Failed to provision user row:', err);
    }
  }

  return (
    <>
      <WalletBootstrap />
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}
