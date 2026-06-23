import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Influuc — AI Personal Brand Operator",
  description:
    "Turn founder expertise into authority with less than 10 minutes per week. Humans supervise, AI operates.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
