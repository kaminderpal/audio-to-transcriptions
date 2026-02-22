import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WaveScribe",
  description: "Upload audio and get your transcript-ready file flow"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
