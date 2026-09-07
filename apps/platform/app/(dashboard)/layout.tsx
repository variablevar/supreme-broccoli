import { redirect } from 'next/navigation';
import { getSession } from '@/lib/customerAuth';
import { Shell } from '@/components/platform/Shell';
export default async function Layout({children}:{children:React.ReactNode}) {
 const session=await getSession();if(!session)redirect('/login');if(session.stage!=='done')redirect('/login/verify');
 return <Shell email={session.email}>{children}</Shell>;
}
