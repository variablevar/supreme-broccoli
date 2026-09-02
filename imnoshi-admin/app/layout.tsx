import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });

export const metadata: Metadata = {
  title: 'Imnoshi Admin',
  description: 'Admin panel for the Imnoshi quant engine platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
        <body className="min-h-screen bg-background text-foreground antialiased">
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'hsl(240 10% 6%)',
                border: '1px solid hsl(240 3.7% 15.9%)',
                color: '#fff',
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
