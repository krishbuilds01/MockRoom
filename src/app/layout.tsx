import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Mock Room - Strict AI Interview Practice",
  description:
    "Practice live interviews with a strict AI interviewer: voice conversations, a coding room that watches your code, company style loops, resume based interviews, and feedback that names exactly what to fix.",
  keywords: ["AI interview practice", "mock interview", "coding interview", "technical interview preparation"],
  openGraph: {
    title: "Mock Room - Strict AI Interview Practice",
    description:
      "A strict AI interviewer that watches your code, pushes back on vague answers, and scores every session out of 10.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-ink font-sans text-neutral-900 antialiased`}>{children}</body>
    </html>
  );
}
