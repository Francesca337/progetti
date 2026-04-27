import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Progetti — Gestione task per project manager",
  description: "Assegna task ai tuoi collaboratori, tieni sotto controllo scadenze e stato di avanzamento.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
