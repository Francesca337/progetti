import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Project Manager',
  description: 'Gestione progetti, task e collaboratori',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
