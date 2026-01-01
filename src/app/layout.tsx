import type { Metadata, Viewport } from 'next';
import { Syne, DM_Sans } from 'next/font/google';
import './globals.css';
import VersionChecker from '@/components/VersionChecker';

// Display font - unique geometric character for headlines
const syne = Syne({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

// Body font - excellent readability for distance viewing
const dmSans = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500'],
});

export const viewport: Viewport = {
  width: 1080,
  height: 2560,
  initialScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Magic Mirror',
  description: 'Smart mirror display for the Jones household',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${dmSans.variable} antialiased`}>
        <VersionChecker />
        {children}
      </body>
    </html>
  );
}
