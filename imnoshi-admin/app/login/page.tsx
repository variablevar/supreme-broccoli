import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';
import { BrandLogo } from '@/components/BrandLogo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { hasRealClerkKeys } from '@/lib/authConfig';

export default function LoginPage() {
  if (!hasRealClerkKeys()) {
    return (
      <main className="min-h-screen w-full grid place-items-center bg-background px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <BrandLogo size={96} showWordmark={false} priority className="mx-auto mb-4 justify-center" />
            <CardTitle className="font-space text-2xl">Clerk keys needed</CardTitle>
            <CardDescription>
              Add real Clerk values and ADMIN_EMAILS to .env.local, then restart the dev server.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (auth().userId) redirect('/');

  return (
    <main className="min-h-screen w-full grid place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <BrandLogo size={96} showWordmark={false} priority className="mx-auto mb-4 justify-center" />
            <CardTitle className="font-space text-2xl">
              <span className="live-brand">IMNOSHI</span> Admin
            </CardTitle>
            <CardDescription>Sign in with an administrator account.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignIn
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90 font-semibold',
                  card: 'bg-transparent shadow-none p-0 w-full',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  formFieldLabel: 'text-foreground',
                  formFieldInput: 'bg-background border-input text-foreground',
                  footerActionLink: 'text-primary hover:underline',
                  dividerLine: 'bg-border',
                  dividerText: 'text-muted-foreground',
                  identityPreviewText: 'text-foreground',
                  identityPreviewEditButton: 'text-primary',
                  form: 'w-full',
                  rootBox: 'w-full',
                  cardBox: 'w-full shadow-none',
                },
              }}
              routing="hash"
              fallbackRedirectUrl="/"
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
