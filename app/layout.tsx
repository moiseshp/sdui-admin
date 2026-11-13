import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SDUI Admin',
  description: 'Gestor de pantallas Server-Driven UI',
};

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-muted/40">
        <header className="sticky top-0 z-30 border-b bg-background">
          <div className="mx-auto flex h-12 max-w-[1500px] items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="rounded-md bg-primary px-1.5 py-0.5 font-mono text-xs text-primary-foreground">SDUI</span>
              Admin
            </Link>
            <a href={WEB_URL} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground">
              Ver cliente web ↗
            </a>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6">{children}</main>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
