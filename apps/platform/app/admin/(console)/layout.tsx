import { redirect } from 'next/navigation';
import { getSession, isAdmin } from '@/lib/adminAuth';
import { Shell } from '@/components/platform/Shell';
export default async function Layout({children}:{children:React.ReactNode}) {
 const session=await getSession();if(!session)redirect('/admin/login');if(session.stage==='reset')redirect('/admin/login/setup');if(session.stage==='totp')redirect('/admin/login/verify');if(!await isAdmin())redirect('/admin/login');
 return <Shell operator email={session.email}>{children}</Shell>;
}
