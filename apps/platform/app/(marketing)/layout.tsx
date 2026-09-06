import { Navbar } from '@/components/marketing/shared/Navbar';
import { Footer } from '@/components/marketing/shared/Footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
