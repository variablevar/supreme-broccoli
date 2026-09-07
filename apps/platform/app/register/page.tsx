import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { LiveBrand } from '@/components/shared/LiveBrand';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/customerAuth';

export default async function RegisterPage() {
  const session = await getSession();
  if (session?.stage === 'done') redirect('/dashboard');

  return (
    <main className="min-h-screen w-full grid place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <BrandLogo size={96} showWordmark={false} priority className="mx-auto mb-4 justify-center" />
            <CardTitle className="font-space text-2xl">Apply for registration</CardTitle>
            <CardDescription>
              Submit your details for review by the Imo team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
