import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InstinctGate - agents that compound",
  description:
    "Capture instincts, promote skills, score verification. Paid cloud product with a 7-day trial. Account and card required. Draft about A$29 AUD/mo.",
  openGraph: {
    title: "InstinctGate",
    description:
      "Your coding agent should get smarter after every session. Start a 7-day trial.",
    locale: "en_AU",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
