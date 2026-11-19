import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">{children}</body>
    </html>
  );
}
