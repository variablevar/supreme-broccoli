import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { RegisterView } from '@/components/auth/RegisterView';
import { hasRealClerkKeys } from '@/lib/authConfig';

export default function RegisterPage() {
  if (!hasRealClerkKeys()) {
    return (
      <main className="min-h-screen grid place-items-center bg-background px-4 py-12">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="font-space text-2xl font-semibold">Clerk keys needed</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Add real Clerk values to .env.local, then restart the dev server to create accounts.
          </p>
        </div>
      </main>
    );
  }

  // Signed-in users go straight to the dashboard — no register flash.
  if (auth().userId) redirect('/dashboard');
  return <RegisterView />;
}
