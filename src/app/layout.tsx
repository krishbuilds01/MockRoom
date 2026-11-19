import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "InterviewAI - Strict AI Interview Practice",
  description:
    "Practice live AI interviews with voice, camera and a LeetCode style coding room. Strict follow-ups, honest scores, weak-area feedback and recommended next problems.",
  keywords: ["AI interview practice", "mock interview", "coding interview", "technical interview preparation"],
  openGraph: {
    title: "InterviewAI - Strict AI Interview Practice",
    description:
      "A strict AI interviewer that watches your code, pushes back on vague answers, and gives feedback that actually teaches.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-[#09090b] font-sans text-zinc-100 antialiased`}>{children}</body>
    </html>
  );
}
