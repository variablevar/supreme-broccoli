import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VerifyForm } from '@/components/auth/VerifyForm';
import { getSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export default async function VerifyPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.stage === 'done') redirect('/');
  if (session.stage === 'reset') redirect('/login/setup');

  return (
    <main className="min-h-screen w-full grid place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <BrandLogo size={72} showWordmark={false} priority className="mx-auto mb-3 justify-center" />
            <CardTitle className="font-space text-2xl">Two-factor required</CardTitle>
            <CardDescription>
              Enter the 6-digit code from Google Authenticator to finish signing in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VerifyForm email={session.email} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}