import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JOOLA Korea 운영 허브",
  description: "JOOLA Korea 내부 운영 대시보드입니다.",
  robots: { index: false, follow: false }, // private internal tool — never index
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
