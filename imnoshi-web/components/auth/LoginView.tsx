'use client';
import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginView() {
  return (
    <main className="min-h-screen w-full grid place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-foreground text-lg">
              I
            </div>
            <CardTitle className="font-space text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to access your Imnoshi dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignIn
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90 font-semibold',
                  card: 'bg-transparent shadow-none p-0 w-full',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'border-input hover:bg-accent hover:text-accent-foreground',
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
              fallbackRedirectUrl="/dashboard"
            />
          </CardContent>
        </Card>

        <p className="text-center text-muted-foreground text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
