import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JOOLA Korea Operations Hub",
  description: "Internal operations dashboard for JOOLA Korea.",
  robots: { index: false, follow: false }, // private internal tool — never index
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
