import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { RegisterView } from '@/components/auth/RegisterView';

export default function RegisterPage() {
  // Signed-in users go straight to the dashboard — no register flash.
  if (auth().userId) redirect('/dashboard');
  return <RegisterView />;
}
