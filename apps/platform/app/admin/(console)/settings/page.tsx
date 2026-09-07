import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsView } from '@/components/admin/dashboard/SettingsView';
import { createAdminClient } from '@/lib/supabase';
import { getSession } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface AccountRow {
  totp_enrolled: boolean;
  must_reset_password: boolean;
  last_login_at: string | null;
  failed_attempts: number;
  locked_until: string | null;
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/admin/login');

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('admin_users')
    .select('totp_enrolled, must_reset_password, last_login_at, failed_attempts, locked_until')
    .eq('id', session.sub)
    .maybeSingle();

  const account: AccountRow = (data as AccountRow | null) ?? {
    totp_enrolled: false,
    must_reset_password: true,
    last_login_at: null,
    failed_attempts: 0,
    locked_until: null,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-space text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account password and two-factor authentication.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-space">Account</CardTitle>
          <CardDescription>
            Signed in as <span className="font-mono">{session.email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsView
            email={session.email}
            totpEnrolled={account.totp_enrolled}
            mustResetPassword={account.must_reset_password}
            lastLoginAt={account.last_login_at}
            failedAttempts={account.failed_attempts}
            lockedUntil={account.locked_until}
            isLocked={Boolean(account.locked_until)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
