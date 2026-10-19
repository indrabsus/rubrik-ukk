import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Rubrik Penilaian UKK PPLG / RPL 2026/2027 • SMK Sangkuriang 1 Cimahi',
  description: 'Portal Penilaian Uji Kompetensi Keahlian (UKK) PPLG / RPL SMK Sangkuriang 1 Cimahi terintegrasi Google Spreadsheet dan Mail Merge Google Docs.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
