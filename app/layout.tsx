import type { Metadata } from 'next';
import { Fredoka, Nunito, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const display = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});
const sans = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
    title: "AI Tutor — your personalised learning companion",
    description:
        "Upload a syllabus or pick a topic, get structured notes, ask your tutor, and track what to revise next.",
    icons: {
        icon: [
            { url: "/home.png", sizes: "32x32", type: "image/png" },
            { url: "/home.png", sizes: "192x192", type: "image/png" },
        ],
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans text-ink bg-paper antialiased">{children}</body>
    </html>
  );
}
