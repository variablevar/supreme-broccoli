import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { LiveBrand } from '@/components/shared/LiveBrand';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/customerAuth';

export default async function LoginPage() {
  const session = await getSession();
  if (session?.stage === 'done') redirect('/dashboard');
  if (session?.stage === 'totp') redirect('/login/verify');

  return (
    <main className="min-h-screen w-full grid place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <BrandLogo size={96} showWordmark={false} priority className="mx-auto mb-4 justify-center" />
            <CardTitle className="font-space text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to access your <LiveBrand className="text-sm align-baseline" /> dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
