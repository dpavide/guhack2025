import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GUHack2025 - Next.js + FastAPI",
  description: "Full-stack application with Next.js frontend and FastAPI backend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
