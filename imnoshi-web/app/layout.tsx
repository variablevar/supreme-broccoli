import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { PageTransition } from '@/components/shared/PageTransition';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });

export const metadata: Metadata = {
  title: 'Imnoshi',
  description: 'GPU-powered quant engine with staking, rewards and adaptive trading.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <body className="min-h-screen bg-background text-foreground antialiased">
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
    </ClerkProvider>
  );
}
