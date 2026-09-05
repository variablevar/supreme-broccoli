import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SetupForm } from '@/components/auth/SetupForm';
import { getSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.stage === 'done') redirect('/');
  if (session.stage === 'totp') redirect('/login/verify');

  return (
    <main className="min-h-screen w-full grid place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <BrandLogo size={72} showWordmark={false} priority className="mx-auto mb-3 justify-center" />
            <CardTitle className="font-space text-2xl">First-time setup</CardTitle>
            <CardDescription>
              Welcome {session.email}. Set a new password and enroll Google Authenticator before you can
              access the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SetupForm email={session.email} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}