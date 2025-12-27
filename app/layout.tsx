import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sora } from "next/font/google";
import { Providers } from "../components/providers";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "Finezza_RB",
  description: "SaaS de odontologia com experiencia premium.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="pt-BR" className={sora.variable}>
      <body className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 antialiased">
        <Providers>
          <div className="pointer-events-none fixed inset-0 -z-10">
            <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-teal-400/15 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-indigo-400/15 blur-[120px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_50%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.06)_40%,transparent_100%)]" />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
