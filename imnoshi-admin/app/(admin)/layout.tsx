import { redirect } from 'next/navigation';
import { getSession, isAdmin } from '@/lib/adminAuth';
import { AdminShell } from '@/components/AdminShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Belt and braces: middleware already redirects incomplete sessions,
  // but we re-check here so a stale cookie can't bypass the gate.
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.stage === 'reset') redirect('/login/setup');
  if (session.stage === 'totp') redirect('/login/verify');

  if (!(await isAdmin())) {
    return (
      <main className="min-h-screen grid place-items-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <ShieldAlert size={22} />
            </div>
            <CardTitle className="font-space">Access denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              This account is not on the admin allowlist. Contact the platform owner if you believe
              this is a mistake.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <AdminShell email={session.email}>{children}</AdminShell>;
}
