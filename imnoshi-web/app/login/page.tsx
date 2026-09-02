import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LoginView } from '@/components/auth/LoginView';

export default function LoginPage() {
  // Signed-in users go straight to the dashboard — no login flash.
  if (auth().userId) redirect('/dashboard');
  return <LoginView />;
}
