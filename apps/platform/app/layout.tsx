import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'sonner';
import { LanguageRuntime } from '@/components/shared/LanguageRuntime';
import { PageTransition } from '@/components/shared/PageTransition';
import { ThemeRuntime } from '@/components/shared/ThemeRuntime';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });

export const metadata: Metadata = {
  title: 'IMNOSHI',
  description: 'Monitor-node access to GPU compute, AI workloads, exchange trading and USDT settlement.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeRuntime />
        <LanguageRuntime />
        <PageTransition>{children}</PageTransition>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(5, 5, 5, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
